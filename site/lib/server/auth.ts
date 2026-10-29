import 'server-only';
import {createHash,randomBytes,scryptSync,timingSafeEqual} from 'node:crypto';
import {cookies} from 'next/headers';
import {db,DbError} from './db';

/** Todas las cuentas y autorizaciones se guardan en PostgreSQL/Supabase.
 * Únicamente pacientes y médicos sintéticos, sin registros reales.
 */
export type Role='medico'|'paciente';
export type Decision='pendiente'|'aprobada'|'rechazada'|'revocada';
export interface DemoUser {
 id:string;role:Role;nombre:string;correo:string;dni?:string;cmp?:string;establecimiento?:string;
 habilitacion?:string;salt:string;hash:string;intentos?:number;bloqueado_hasta?:string|null;
}
export interface Solicitud {id:string;doctor_id:string;patient_id:string;dni:string;finalidad:string;estado:Decision;creada:string;decidida?:string;expira?:string;}
export interface Evento {id:string;cuando:string;actor_id:string;patient_id?:string;solicitud_id?:string;accion:string;detalle:string;}
export type SafeUser=Pick<DemoUser,'id'|'role'|'nombre'|'correo'|'dni'|'cmp'|'establecimiento'|'habilitacion'>;
const COOKIE='sjl_session';
const iso=()=>new Date().toISOString();
const tokenHash=(token:string)=>createHash('sha256').update(token).digest('hex');
const senha=(password:string,salt:string)=>scryptSync(password,salt,64).toString('hex');
const codeCompare=(actual:string,expected:string)=>{const a=createHash('sha256').update(actual).digest();const b=createHash('sha256').update(expected).digest();return timingSafeEqual(a,b);};
export const publicUser=(u:DemoUser):SafeUser=>({id:u.id,role:u.role,nombre:u.nombre,correo:u.correo,dni:u.dni,cmp:u.cmp,establecimiento:u.establecimiento,habilitacion:u.habilitacion});
const uuid=()=>randomBytes(16).toString('hex');
const rows=async<T>(table:string,filter:Record<string,string|number|boolean|undefined>,select='*'):Promise<T[]>=> db<T[]>(table,'GET',{select,...filter});
async function first<T>(table:string,filters:Record<string,string|number|boolean|undefined>,select='*'):Promise<T|undefined>{return (await rows<T>(table,{...filters,limit:'1'},select))[0];}
async function audit(actor:string,accion:string,detalle:string,patient?:string,solicitud?:string){
 await db('portal_eventos','POST',{},[{id:uuid(),actor_id:actor,accion,detalle,patient_id:patient??null,solicitud_id:solicitud??null}],{'Prefer':'return=minimal'});
}
export async function authenticate(correo:string,password:string,perfil:Role,documento:string,codigo=''):Promise<{token?:string,user?:SafeUser,error?:string}>{
 // Protección obligatoria en producción: los usuarios ficticios tienen contraseñas públicas de demo.
 const invitacion=process.env.DEMO_ACCESS_CODE;
 if(process.env.NODE_ENV==='production' && (!invitacion || invitacion.length<16 || /REEMPLAZAR|CHANGE_ME/i.test(invitacion)))
   throw new Error('CODIGO_INVITACION_REQUERIDO');
 if(invitacion && !codeCompare(codigo,invitacion))return {error:'Credenciales o código de invitación incorrectos.'};
 const usuario=await first<DemoUser>('portal_usuarios',{correo:`eq.${correo.trim().toLowerCase()}`});
 const salt=usuario?.salt??'aabbccddeeff00112233445566778899';
 const intento=senha(password,salt);
 const expected=Buffer.from(usuario?.hash??'0'.repeat(128),'hex');
 const correcto=timingSafeEqual(Buffer.from(intento,'hex'),expected);
 const bloqueado=Boolean(usuario?.bloqueado_hasta&&Date.parse(usuario.bloqueado_hasta)>Date.now());
 if(!usuario||!correcto||usuario.role!==perfil||(perfil==='paciente'&&usuario.dni!==documento)||(perfil==='medico'&&usuario.cmp!==documento)||bloqueado){
  if(usuario){const intentos=(usuario.intentos??0)+1;await db('portal_usuarios','PATCH',{id:`eq.${usuario.id}`},{intentos:intentos>=5?0:intentos,bloqueado_hasta:intentos>=5?new Date(Date.now()+15*60_000).toISOString():usuario.bloqueado_hasta??null});}
  return {error:'Credenciales inválidas o cuenta temporalmente bloqueada.'};
 }
 await db('portal_usuarios','PATCH',{id:`eq.${usuario.id}`},{intentos:0,bloqueado_hasta:null});
 const token=randomBytes(32).toString('hex');
 await db('portal_sesiones','POST',{},[{hash:tokenHash(token),user_id:usuario.id,expira:new Date(Date.now()+8*3600_000).toISOString()}],{'Prefer':'return=minimal'});
 await audit(usuario.id,'inicio_sesion','Acceso al portal de demostración');
 return {token,user:publicUser(usuario)};
}
export async function session():Promise<DemoUser|null>{
 const token=(await cookies()).get(COOKIE)?.value;
 if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
 const found=await first<{user_id:string,expira:string}>('portal_sesiones',{hash:`eq.${tokenHash(token)}`,expira:`gt.${iso()}`});
 if(!found)return null;
 return (await first<DemoUser>('portal_usuarios',{id:`eq.${found.user_id}`}))??null;
}
export async function setSession(token:string){(await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:8*3600});}
export async function endSession(){const c=await cookies(),token=c.get(COOKIE)?.value;
 if(token&&/^[a-f0-9]{64}$/.test(token))await db('portal_sesiones','DELETE',{hash:`eq.${tokenHash(token)}`});
 c.delete(COOKIE);
}
export async function patientByDni(dni:string):Promise<DemoUser|undefined>{return first<DemoUser>('portal_usuarios',{role:'eq.paciente',dni:`eq.${dni}`});}
export async function hasPermission(doctor:DemoUser,dni:string):Promise<boolean>{
 if(doctor.role!=='medico')return false;
 const x=await first<Solicitud>('portal_solicitudes',{doctor_id:`eq.${doctor.id}`,dni:`eq.${dni}`,estado:'eq.aprobada',expira:`gt.${iso()}`},'id');
 return Boolean(x);
}
export async function requestAccess(doctor:DemoUser,dni:string,finalidad:string):Promise<string>{
 if(doctor.role!=='medico')throw new Error('Sin permiso.');
 const patient=await patientByDni(dni);
 if(!patient)return 'Solicitud recibida. Si el documento corresponde a una cuenta de prueba, aparecerá en su portal.';
 const today=new Date();today.setUTCHours(0,0,0,0);
 const solicitudesHoy=await rows<{id:string}>('portal_solicitudes',{doctor_id:`eq.${doctor.id}`,creada:`gte.${today.toISOString()}`},'id');
 if(solicitudesHoy.length>=30)throw new Error('Límite diario de solicitudes alcanzado.');
 const pending=await first<Solicitud>('portal_solicitudes',{doctor_id:`eq.${doctor.id}`,patient_id:`eq.${patient.id}`,estado:'eq.pendiente'},'id');
 if(pending)return 'Ya existe una solicitud pendiente.';
 const id=uuid();
 try{await db('portal_solicitudes','POST',{},[{id,doctor_id:doctor.id,patient_id:patient.id,dni,finalidad,estado:'pendiente'}],{'Prefer':'return=minimal'});}
 catch(e){if(e instanceof DbError&&e.code==='23505')return 'Ya existe una solicitud pendiente.';throw e;}
 await audit(doctor.id,'solicitud_creada',`Solicitud de acceso · ${finalidad}`,patient.id,id);
 return 'Solicitud recibida. Si el documento corresponde a una cuenta de prueba, aparecerá en su portal.';
}
export async function decide(patient:DemoUser,id:string,accion:'aprobar'|'rechazar'|'revocar',horas=24):Promise<void>{
 if(patient.role!=='paciente')throw new Error('Sin permiso.');
 const nuevo:Decision=accion==='aprobar'?'aprobada':accion==='rechazar'?'rechazada':'revocada';
 const estadoAnterior=accion==='revocar'?'aprobada':'pendiente';
 const cambios={estado:nuevo,decidida:iso(),expira:accion==='aprobar'?new Date(Date.now()+horas*3600_000).toISOString():accion==='revocar'?iso():null};
 // El filtro CAS protege contra doble aprobación o revocación simultánea.
 const changed=await db<Solicitud[]>('portal_solicitudes','PATCH',{id:`eq.${id}`,patient_id:`eq.${patient.id}`,estado:`eq.${estadoAnterior}`,select:'id'},cambios,{'Prefer':'return=representation'});
 if(!changed.length)throw new Error('Solicitud inexistente o decisión ya registrada.');
 await audit(patient.id,`autorizacion_${nuevo}`,`Decisión del paciente: ${nuevo}`,patient.id,id);
}
export async function registerAccess(actor:DemoUser,patientId:string,ok:boolean){await audit(actor.id,ok?'historia_consultada':'consulta_denegada',ok?'Visualización de historial sintético':'Consulta sin autorización',patientId);}
export async function userRequests(u:DemoUser){
 const solicitudes=await rows<Solicitud>('portal_solicitudes',{[u.role==='medico'?'doctor_id':'patient_id']:`eq.${u.id}`,order:'creada.desc',limit:100});
 const usuarios=await rows<Pick<DemoUser,'id'|'nombre'>>('portal_usuarios',{},'id,nombre');
 const nombres=new Map(usuarios.map(a=>[a.id,a.nombre]));
 return solicitudes.map(s=>({id:s.id,doctorId:s.doctor_id,patientId:s.patient_id,dni:s.dni,finalidad:s.finalidad,estado:s.estado,creada:s.creada,decidida:s.decidida,expira:s.expira,doctor:nombres.get(s.doctor_id)??'Desconocido',paciente:u.role==='paciente'||(s.estado==='aprobada'&&s.expira&&Date.parse(s.expira)>Date.now())?nombres.get(s.patient_id)??'Desconocido':'Identidad reservada hasta autorizar'}));
}
export async function userEvents(u:DemoUser){
 const filter=u.role==='medico'?{actor_id:`eq.${u.id}`}:{or:`(patient_id.eq.${u.id},actor_id.eq.${u.id})`};
 const [eventos,usuarios]=await Promise.all([rows<Evento>('portal_eventos',{...filter,order:'cuando.desc',limit:100}),rows<Pick<DemoUser,'id'|'nombre'>>('portal_usuarios',{},'id,nombre')]);
 const names=new Map(usuarios.map(x=>[x.id,x.nombre]));
 return eventos.map(e=>({id:e.id,cuando:e.cuando,accion:e.accion,detalle:e.detalle,actor:names.get(e.actor_id)??'Desconocido',patientId:e.patient_id}));
}
export function checkOrigin(req:Request){const origin=req.headers.get('origin');const site=req.headers.get('sec-fetch-site');if(site==='cross-site')return false;try{return !origin||new URL(origin).origin===new URL(req.url).origin;}catch{return false;}}
