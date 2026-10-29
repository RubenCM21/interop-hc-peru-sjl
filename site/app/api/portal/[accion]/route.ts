import { NextRequest,NextResponse } from 'next/server';
import { authenticate,setSession,endSession,session,publicUser,patientByDni,requestAccess,decide,userRequests,userEvents,registerAccess,hasPermission,checkOrigin } from '@/lib/server/auth';
import { clinicalSummary,catalogoExamenes } from '@/lib/server/clinical';
import { DbError } from '@/lib/server/db';
import type { Clave } from '@/lib/data';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const response=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
const denied=()=>response({error:'No autorizado.'},401);
const forbidden=()=>response({error:'Acceso no permitido.'},403);
const bad=(message:string)=>response({error:message},400);
const actionOf=async(c:{params:Promise<{accion:string}>})=>(await c.params).accion;
const errorResponse=(e:unknown)=>{
 console.error('Error del portal:',e instanceof DbError ? `persistencia (${e.status})` : e instanceof Error?e.name:'desconocido');
 return response({error:'No fue posible conectar con el servicio. Intenta de nuevo.'},503);
};
export async function GET(req:NextRequest,c:{params:Promise<{accion:string}>}){
 try{
  const action=await actionOf(c),u=await session();if(!u)return denied();
  if(action==='me')return response({user:publicUser(u)});
  if(action==='solicitudes')return response({solicitudes:await userRequests(u)});
  if(action==='auditoria')return response({eventos:await userEvents(u)});
  if(action==='catalogo')return response({examenes:catalogoExamenes()});
  if(action==='historial'){
   const dni=u.role==='paciente'?u.dni:req.nextUrl.searchParams.get('dni');
   if(!dni||!/^[0-9]{8}$/.test(dni))return bad('DNI sintético inválido.');
   const p=await patientByDni(dni);if(!p)return response({error:'Paciente no disponible.'},404);
   const autorizado=(u.role==='paciente'&&u.id===p.id)||(await hasPermission(u,dni));
   if(!autorizado){await registerAccess(u,p.id,false);return forbidden();}
   const omitir=req.nextUrl.searchParams.get('omitir');
   const fuente:Clave|undefined=['minsa','essalud','clinica'].includes(omitir??'')?omitir as Clave:undefined;
   const resumen=clinicalSummary(dni,fuente);if(!resumen)return response({error:'Historia sintética no encontrada.'},404);
   // Revalidar autorización tras construir respuesta; revocar antes de finalizar debe bloquear.
   if(u.role==='medico'&&!(await hasPermission(u,dni))){await registerAccess(u,p.id,false);return forbidden();}
   await registerAccess(u,p.id,true);
   return response({resumen});
  }
  return response({error:'No encontrado.'},404);
 }catch(e){return errorResponse(e);}
}
export async function POST(req:NextRequest,c:{params:Promise<{accion:string}>}){
 if(!checkOrigin(req))return forbidden();
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return bad('Se requiere JSON.');
 try{
  const action=await actionOf(c);
  const body=await req.json().catch(()=>null);
  if(action==='login'){
   if(!body||typeof body.correo!=='string'||typeof body.password!=='string'||body.correo.length>150||body.password.length>128||!['medico','paciente'].includes(body.perfil)||typeof body.documento!=='string'||body.documento.length>24||typeof body.codigo!=='string'||body.codigo.length>200)return bad('Credenciales inválidas.');
   const result=await authenticate(body.correo,body.password,body.perfil,body.documento,body.codigo);
   if(!result.token)return response({error:result.error},401);
   await setSession(result.token);return response({user:result.user});
  }
  if(action==='logout'){await endSession();return response({ok:true});}
  const u=await session();if(!u)return denied();
  if(action==='solicitar'){
   if(u.role!=='medico')return forbidden();
   if(!body||typeof body.dni!=='string'||!/^[0-9]{8}$/.test(body.dni)||typeof body.finalidad!=='string'||body.finalidad.trim().length<10||body.finalidad.length>300)return bad('Ingrese DNI y motivo de consulta (mínimo 10 caracteres).');
   return response({mensaje:await requestAccess(u,body.dni,body.finalidad.trim())});
  }
  if(action==='decidir'){
   if(u.role!=='paciente')return forbidden();
   if(!body||typeof body.id!=='string'||!['aprobar','rechazar','revocar'].includes(body.accion)||![1,24,168].includes(Number(body.horas??24)))return bad('Decisión incorrecta.');
   await decide(u,body.id,body.accion,Number(body.horas??24));return response({ok:true});
  }
  return response({error:'No encontrado.'},404);
 }catch(e){
  if(e instanceof DbError)return errorResponse(e);
  if(e instanceof Error&&/Sin permiso|Límite diario|Solicitud inexistente/.test(e.message))return bad(e.message);
  return errorResponse(e);
 }
}
