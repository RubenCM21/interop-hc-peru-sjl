import 'server-only';

/** PostgREST de Supabase. SOLO servidor: jamás exponer SUPABASE_SECRET_KEY en NEXT_PUBLIC_*. */
const config = () => {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!base || !/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(base) || !key?.startsWith('sb_secret_')) {
    throw new Error('CONFIGURACION_BD: configura SUPABASE_URL y SUPABASE_SECRET_KEY (secret key nueva) en el servidor.');
  }
  return {base:base.replace(/\/$/,''),key};
};

export class DbError extends Error {
  constructor(message:string, public status:number, public code?:string){super(message);}
}
type Filter = Record<string,string|number|boolean|undefined>;
export async function db<T>(tabla:string, method:'GET'|'POST'|'PATCH'|'DELETE'='GET', params:Filter={}, body?:unknown, extraHeaders:Record<string,string>={}):Promise<T>{
  if (!/^[a-z_]+$/.test(tabla)) throw new Error('Ruta de base de datos inválida');
  const {base,key}=config();
  const url=new URL(`${base}/rest/v1/${tabla}`);
  for (const [k,v] of Object.entries(params)) if(v!==undefined)url.searchParams.set(k,String(v));
  const headers:Record<string,string>={apikey:key,'Accept':'application/json','Content-Type':'application/json','Cache-Control':'no-store',...extraHeaders};
  let response:Response;
  try {response=await fetch(url.toString(),{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)});}
  catch {throw new DbError('No se pudo contactar a la base de datos de demostración.',503);}
  if (!response.ok) {
    const problem=await response.json().catch(()=>({}));
    // No propagar mensajes SQL, URL ni credenciales al cliente.
    throw new DbError('Error del servicio de persistencia.',response.status,typeof problem.code==='string'?problem.code:undefined);
  }
  if(response.status===204)return [] as T;
  return await response.json() as T;
}
