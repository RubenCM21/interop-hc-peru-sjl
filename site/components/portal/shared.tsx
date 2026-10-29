'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { SafeUser } from '@/lib/server/auth';
import { btn,contenedor,panel } from '@/components/ui';
export type SolicitudView={id:string;doctorId:string;patientId:string;dni:string;finalidad:string;estado:'pendiente'|'aprobada'|'rechazada'|'revocada';creada:string;decidida?:string;expira?:string;doctor:string;paciente:string};
export type EventView={id:string;cuando:string;accion:string;detalle:string;actor:string;patientId?:string};
export const dateTime=(iso?:string)=>iso?new Date(iso).toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Lima'}):'Sin registro';
export const dateOnly=(iso?:string)=>iso?new Date(`${iso.slice(0,10)}T12:00:00-05:00`).toLocaleDateString('es-PE',{dateStyle:'medium',timeZone:'America/Lima'}):'No registrada';
export async function fetchPortal(action:string, method:'GET'|'POST'='GET',data?:unknown){
 const r=await fetch(`/api/portal/${action}`,{method,headers:method==='POST'?{'Content-Type':'application/json'}:undefined,body:method==='POST'?JSON.stringify(data):undefined,credentials:'same-origin',cache:'no-store'});
 const j=await r.json().catch(()=>({error:'Respuesta inválida del servidor.'}));if(!r.ok)throw new Error(j.error??`Error ${r.status}`);return j;
}
export function BannerDemo(){return <div role="note" className="mb-5 rounded-card border border-warn-line bg-warn-bg px-4 py-3 text-sm text-ink"><strong>ENTORNO ACADÉMICO · DATOS SINTÉTICOS.</strong> Las sedes de SJL son referencias geográficas; no están conectadas. La verificación CMP y las autorizaciones no son oficiales. No introduzcas información personal real.</div>;}
export function PortalLayout({user,children,title,lead}:{user:SafeUser;children:React.ReactNode;title:string;lead:string}){
 const router=useRouter(),[exit,setExit]=useState(false);
 const salir=async()=>{setExit(true);try{await fetchPortal('logout','POST',{});router.replace('/ingresar');router.refresh();}catch{setExit(false);}};
 return <div className={`${contenedor} py-7 sm:py-10`}>
 <BannerDemo/>
 <div className="mb-6 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-accent-strong">Historia clínica conectada · SJL</p><h1 className="mt-1 text-3xl font-bold sm:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm text-muted">{lead}</p></div><div className="flex flex-wrap items-center gap-3"><div className="rounded-ctl border border-line bg-surface px-3 py-2"><p className="text-sm font-semibold">{user.nombre}</p><p className="text-xs text-muted">{user.role==='medico'?'Profesional ficticio':'Paciente ficticio'}</p></div><button type="button" onClick={salir} disabled={exit} className={btn.ghost}>Cerrar sesión</button></div></div>
 {children}</div>;
}
export function LoadingBlock(){return <div className={`${panel} animate-pulse text-sm text-muted`}>Consultando información de demostración...</div>;}
export function ErrorBlock({mensaje}:{mensaje:string}){return <div role="alert" className="rounded-ctl border border-danger-line bg-danger-bg px-4 py-3 text-sm text-danger">{mensaje}</div>;}
export function Pill({status}:{status:string}){
 const label=status==='pendiente'?'Pendiente':status==='aprobada'?'Autorizada':status==='rechazada'?'Rechazada':status==='revocada'?'Revocada':status;
 const classes=status==='aprobada'?'bg-ok-bg text-ok':status==='pendiente'?'bg-warn-bg text-warn':status==='rechazada'||status==='revocada'?'bg-danger-bg text-danger':'bg-surface-2 text-muted';
 return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
}
export function Audits({events}:{events:EventView[]}){return <section className={panel}><h2 className="text-xl font-bold">Registro de accesos y decisiones</h2><p className="mt-2 text-sm text-muted">Eventos de esta demostración. Identifica quién consultó y cuándo; no equivale a una auditoría regulatoria certificada.</p><div className="mt-5 grid gap-2">{events.length===0?<p className="text-sm text-muted">Aún no existen eventos visibles.</p>:events.map(e=><div key={e.id} className="rounded-ctl border border-line px-3 py-3"><div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">{e.accion.replaceAll('_',' ')}</strong><span className="text-xs text-muted">{dateTime(e.cuando)}</span></div><p className="mt-1 text-sm text-muted">{e.actor} · {e.detalle}</p></div>)}</div></section>;}
