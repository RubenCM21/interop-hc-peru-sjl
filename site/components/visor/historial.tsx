"use client";

import { useMemo, useState } from 'react';
import type { Atencion, Examen, Resumen } from '@/lib/gateway';
import { SEDES_SJL } from '@/lib/establecimientos-sjl';
import { panel, fecha, fechaHora } from '../ui';

const periodos = [
 {v:'all',t:'Todo el historial'}, {v:'7',t:'7 días'}, {v:'30',t:'30 días'},
 {v:'90',t:'3 meses'}, {v:'180',t:'6 meses'}, {v:'365',t:'1 año'},
];
const estilos = 'min-h-11 w-full rounded-ctl border border-line bg-bg px-3 text-sm text-ink';
function fechaDentro(fecha:string, plazo:string) {
 if(plazo==='all') return true;
 const hoy = new Date(); const d = new Date(`${fecha}T12:00:00`);
 return (hoy.getTime()-d.getTime())/86400000 <= Number(plazo) && d.getTime()<=hoy.getTime();
}
function ExamenFicha({e}:{e:Examen}) {
 return <div className="rounded-ctl border border-line bg-bg p-3">
  <div className="flex flex-wrap justify-between gap-2">
    <span className="font-medium text-ink">{e.nombre}</span>
    <span className="text-xs text-muted">{e.estado==='final'?'Final':'Estado: '+(e.estado??'no especificado')}</span>
  </div>
  <div className="mt-2 text-[0.94rem]"><strong className="tabular-nums">{e.resultado}</strong>{e.referencia&&<span className="ml-2 text-xs text-muted">Referencia: {e.referencia}</span>}</div>
  {e.muestra && <p className="mt-1 text-xs text-muted">Muestra: {e.muestra}</p>}
  {e.interpretacion && <p className="mt-2 rounded-md bg-surface-2 p-2 text-xs">Orientación: {e.interpretacion}</p>}
  {e.fuenteReferencia && <a className="mt-2 block break-all text-xs text-accent-strong underline" href={e.fuenteReferencia} target="_blank" rel="noopener noreferrer">Referencia clínica utilizada</a>}
  <p className="mt-2 text-xs text-muted">Código LOINC: {e.codigo ?? 'No normalizado'} · Fecha: {fecha(e.fecha)} · {e.establecimiento}</p>
 </div>;
}
function Filtros({q,setQ,periodo,setPeriodo,sede,setSede,sedes,tipo,setTipo}:any){
 return <div className="mt-4 grid gap-3 md:grid-cols-4">
  <label className="text-xs font-medium text-muted md:col-span-1">Buscar
   <input className={`${estilos} mt-1`} value={q} onChange={e=>setQ(e.target.value)} placeholder="Examen, médico, diagnóstico..." aria-label="Buscar en historial"/>
  </label>
  <label className="text-xs font-medium text-muted">Período
   <select className={`${estilos} mt-1`} value={periodo} onChange={e=>setPeriodo(e.target.value)}>{periodos.map(p=><option key={p.v} value={p.v}>{p.t}</option>)}</select>
  </label>
  <label className="text-xs font-medium text-muted">Establecimiento
   <select className={`${estilos} mt-1`} value={sede} onChange={e=>setSede(e.target.value)}><option value="all">Todas las sedes</option>{sedes.map((s:string)=><option key={s} value={s}>{s}</option>)}</select>
  </label>
  <label className="text-xs font-medium text-muted">Tipo de examen
   <select className={`${estilos} mt-1`} value={tipo} onChange={e=>setTipo(e.target.value)}><option value="all">Todos</option><option value="laboratorio">Laboratorio</option><option value="imagen">Imágenes</option><option value="gabinete">Gabinete / ECG</option></select>
  </label>
 </div>;
}
export function HistorialAtenciones({r}:{r:Resumen}) {
 const [q,setQ]=useState('');const [periodo,setPeriodo]=useState('all');const [sede,setSede]=useState('all');const [tipo,setTipo]=useState('all');
 const sedes=useMemo(()=>[...new Set(r.atenciones.map(a=>a.establecimiento))].sort(),[r.atenciones]);
 const filtradas=useMemo(()=>r.atenciones.filter(a=>{
  if(!fechaDentro(a.fecha,periodo) || (sede!=='all'&&a.establecimiento!==sede))return false;
  if(tipo!=='all' && !a.examenes.some(e=>e.tipo===tipo))return false;
  const texto=[a.establecimiento,a.profesional,a.motivo,a.diagnostico,...a.medicamentos,...a.examenes.map(e=>e.nombre)].join(' ').toLowerCase();
  return texto.includes(q.trim().toLowerCase());
 }),[r.atenciones,q,periodo,sede,tipo]);
 return <section id="atenciones" className={panel}>
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-bold">Historial de atenciones</h2><p className="mt-1 text-sm text-muted">Cada atención conserva su profesional, sede, motivo, exámenes y tratamientos vinculados.</p></div><span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold">{filtradas.length} atenciones</span></div>
  <Filtros {...{q,setQ,periodo,setPeriodo,sede,setSede,sedes,tipo,setTipo}}/>
  <div className="mt-5 grid gap-3">
   {!filtradas.length&&<p className="rounded-ctl bg-surface-2 p-4 text-sm text-muted">No se encontraron atenciones que coincidan con los filtros.</p>}
   {filtradas.map(a=><details key={a.id} className="group rounded-card border border-line bg-bg">
    <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden">
     <div className="flex flex-wrap justify-between gap-3"><div><h3 className="font-semibold">{a.establecimiento}</h3><p className="mt-1 text-sm text-muted">{a.profesional} · {a.tipo.replace(' - demostración','')}</p></div><div className="text-sm font-medium tabular-nums">{fecha(a.fecha)} · 09:25</div></div>
     <p className="mt-2 text-sm text-muted">{a.motivo}</p>
     <p className="mt-2 text-xs font-semibold text-accent-strong">{a.examenes.length} exámenes · {a.medicamentos.length} tratamientos · Abrir detalle</p>
    </summary>
    <div className="grid gap-4 border-t border-line p-4">
      <div><h4 className="text-sm font-semibold">Motivo de consulta</h4><p className="mt-1 text-sm">{a.motivo}</p></div>
      <div><h4 className="text-sm font-semibold">Síntomas y anamnesis sintética</h4><p className="mt-1 text-sm">{a.sintomas}</p></div>
      <div><h4 className="text-sm font-semibold">Signos vitales de demostración</h4><p className="mt-1 text-sm">{a.signos}</p></div>
      <div><h4 className="text-sm font-semibold">Evaluación médica sintética</h4><p className="mt-1 text-sm">{a.evaluacion}</p></div>
      <div><h4 className="text-sm font-semibold">Diagnóstico asociado (sintético)</h4><p className="mt-1 text-sm">{a.diagnostico}</p></div>
      <div><h4 className="text-sm font-semibold">Exámenes de esta atención</h4><div className="mt-2 grid gap-2">{a.examenes.length?a.examenes.map(e=><ExamenFicha key={e.idLocal} e={e}/>):<p className="text-sm text-muted">No se registraron exámenes vinculados.</p>}</div></div>
      <div><h4 className="text-sm font-semibold">Tratamientos documentados</h4>{a.medicamentos.length?<ul className="mt-2 list-inside list-disc text-sm">{a.medicamentos.map((m,i)=><li key={i}>{m}</li>)}</ul>:<p className="mt-1 text-sm text-muted">Sin tratamiento documentado en esta atención.</p>}</div>
      <div><h4 className="text-sm font-semibold">Plan e indicaciones</h4><p className="mt-1 text-sm">{a.plan}</p></div>
      <div><h4 className="text-sm font-semibold">Seguimiento</h4><p className="mt-1 text-sm">{a.seguimiento}</p></div>
      <p className="border-t border-line pt-3 text-xs text-muted">Todos los campos de esta ficha se generaron como datos clínicos sintéticos y no proceden de un centro ni de un profesional real. No constituyen diagnóstico ni indicaciones médicas.</p>
    </div>
   </details>)}
  </div>
 </section>;
}
export function ExamenesFiltrados({r}:{r:Resumen}) {
 const [q,setQ]=useState('');const [periodo,setPeriodo]=useState('90');const [sede,setSede]=useState('all');const [tipo,setTipo]=useState('all');
 const sedes=useMemo(()=>[...new Set(r.examenes.map(e=>e.establecimiento))].sort(),[r.examenes]);
 const filtrados=useMemo(()=>r.examenes.filter(e=>fechaDentro(e.fecha,periodo)&&(sede==='all'||e.establecimiento===sede)&&(tipo==='all'||e.tipo===tipo)&&[e.nombre,e.codigo,e.resultado,e.establecimiento].join(' ').toLowerCase().includes(q.toLowerCase())),[r.examenes,q,periodo,sede,tipo]);
 return <section id="examenes" className={panel}>
  <div className="flex flex-wrap justify-between gap-2"><div><h2 className="text-xl font-bold">Exámenes y resultados clínicos</h2><p className="mt-1 text-sm text-muted">Filtre por período, sede, clase de prueba o nombre. Abra un resultado para ver su contexto.</p></div><span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-semibold">{filtrados.length} resultados</span></div>
  <Filtros {...{q,setQ,periodo,setPeriodo,sede,setSede,sedes,tipo,setTipo}}/>
  <div className="mt-4 grid gap-2">{!filtrados.length&&<p className="rounded-ctl bg-surface-2 p-4 text-sm text-muted">No hay resultados para estos filtros.</p>}{filtrados.map(e=><details key={`${e.sistema}-${e.idLocal}`} className="rounded-ctl border border-line p-3"><summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden"><div className="flex flex-wrap items-center justify-between gap-2"><div className="text-sm font-semibold">{e.nombre}<p className="mt-1 text-xs font-normal text-muted">{fecha(e.fecha)} · {e.establecimiento}</p></div><span className="text-sm font-semibold tabular-nums">{e.resultado}</span></div></summary><div className="mt-3"><ExamenFicha e={e}/></div></details>)}</div>
  <p className="mt-4 text-xs text-muted">Los rangos son orientativos y no permiten diagnosticar por sí solos. Prevalecen los intervalos y criterios clínicos del laboratorio emisor y el juicio del profesional.</p>
 </section>;
}
export function DirectorioSJL(){
 const [texto,setTexto]=useState(''); const [red,setRed]=useState('all');
 const visibles=SEDES_SJL.filter(e=>(red==='all'||e.red===red)&&e.nombre.toLowerCase().includes(texto.toLowerCase()));
 return <section id="sedes-sjl" className={panel}><h2 className="text-lg font-semibold">Directorio referencial · San Juan de Lurigancho</h2>
  <p className="mt-1 text-sm text-muted">Sedes para escenarios ficticios. Su inclusión no implica convenio, conexión, disponibilidad ni confirmación de categoría o dirección.</p>
  <div className="mt-3 grid gap-2 sm:grid-cols-2"><input className={estilos} placeholder="Buscar establecimiento" value={texto} onChange={e=>setTexto(e.target.value)}/><select className={estilos} value={red} onChange={e=>setRed(e.target.value)}><option value="all">Todas las redes</option><option value="minsa">Minsa</option><option value="essalud">EsSalud</option><option value="municipal">Municipal</option><option value="privada">Privadas y policlínicos</option></select></div>
  <p className="mt-2 text-xs text-muted">{visibles.length} sedes del directorio · «Fuente equipo» = pendiente de validar con RENIPRESS.</p>
  <ul className="mt-3 grid gap-2 sm:grid-cols-2">{visibles.map(s=><li key={s.id} className="rounded-ctl border border-line px-3 py-2.5"><span className="block text-sm font-semibold">{s.nombre}</span><span className="text-xs text-muted">{s.tipo} · {s.evidencia==='minsa'?'Listado MINSA consultado':'Nombre aportado por equipo'}</span></li>)}</ul>
 </section>;
}
