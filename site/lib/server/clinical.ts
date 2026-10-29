import 'server-only';
import { stores } from '@/lib/fhir-server';
import { SISTEMAS, CATALOGO, LOINC, CLINICA_LOCAL, LOCAL_A_LOINC, type Clave } from '@/lib/data';
import { EXAMENES, interpretarResultado } from '@/lib/catalogo-clinico';
import type { Resumen, Atencion, Examen, Alerta, Fuente } from '@/lib/gateway';

const keys:Clave[]=['minsa','essalud','clinica'];
const edad=(s:string)=>{const d=new Date(s),h=new Date();return h.getFullYear()-d.getUTCFullYear()-(h.getMonth()<d.getUTCMonth()||(h.getMonth()===d.getUTCMonth()&&h.getDate()<d.getUTCDate())?1:0);};
function codeOf(r:any):{code:string|null,original:string|null}{
 const codes=r.code?.coding??[];
 const local=codes.find((x:any)=>x.system===CLINICA_LOCAL);
 const loinc=codes.find((x:any)=>x.system===LOINC);
 return {code:loinc?.code??(local?LOCAL_A_LOINC[local.code]??null:null),original:local?.code??null};
}
function examen(r:any,k:Clave):Examen {
 const {code,original}=codeOf(r);const meta=code?EXAMENES[code]:undefined;
 const valor=r.resourceType==='Observation'?r.valueQuantity?.value:undefined;
 return {
  codigo:code,codigoOriginal:original,nombre:meta?.nombre??r.code?.text??'Examen sin catalogar',
  fecha:(r.effectiveDateTime??'').slice(0,10),fechaHora:r.effectiveDateTime,
  resultado:typeof valor==='number'?`${valor} ${r.valueQuantity?.unit??''}`:r.conclusion??'Informe pendiente',
  sistema:k, establecimiento:(r.performer?.[0]?.display??SISTEMAS[k].establecimiento).replace(/ \(simulad[oa]\)$/,'').replace(/ \(sede simulada\)$/,''),
  idLocal:r.id,valor,unidad:r.valueQuantity?.unit,referencia:r.referenceRange?.[0]?.text??meta?.referencia,
  interpretacion:typeof valor==='number'&&code?interpretarResultado(code,valor).texto:undefined,
  fuenteReferencia:meta?.fuente,muestra:r.specimen?.display??meta?.muestra,tipo:meta?.tipo??'laboratorio',estado:r.status,
  encuentro:r.encounter?.reference?.split('/').pop(),
 };
}
function alertasPrevias(es:Examen[]):Alerta[]{const por=new Map<string,Examen[]>();
 for(const e of es)if(e.codigo&&CATALOGO[e.codigo])por.set(e.codigo,[...(por.get(e.codigo)??[]),e]);
 const alerts:Alerta[]=[];
 for(const [codigo,lista] of por){lista.sort((a,b)=>a.fecha.localeCompare(b.fecha));const [nombre,ventana]=CATALOGO[codigo];
  for(let i=1;i<lista.length;i++){const a=lista[i-1],b=lista[i];const dias=Math.round((Date.parse(b.fecha)-Date.parse(a.fecha))/86400000);
   if(a.sistema!==b.sistema&&dias<=ventana)alerts.push({codigo,examen:nombre,fechaAnterior:a.fecha,lugarAnterior:a.establecimiento,sistemaAnterior:a.sistema,fechaRepeticion:b.fecha,lugarRepeticion:b.establecimiento,sistemaRepeticion:b.sistema,dias,ventana});
  }
 }
 return alerts.sort((a,b)=>b.fechaRepeticion.localeCompare(a.fechaRepeticion));
}
export function clinicalSummary(dni:string,omitir?:Clave):Resumen|null {
 const matches=keys.map(k=>{const st=stores[k]; const p=[...st.pacientes.values()].find((p:any)=>p.identifier.some((id:any)=>id.value===dni));return {k,patient:p,resources:p?st.recursos.get(p.id):null};});
 if(!matches.some(m=>m.patient))return null;
 const principal=matches.find(m=>m.patient)!.patient;
 const examenes:Examen[]=[],atenciones:Atencion[]=[];
 const meds=new Map<string,Resumen['medicamentos'][number]>(),alergias=new Map<string,Resumen['alergias'][number]>(),condiciones=new Map<string,Resumen['condiciones'][number]>();
 let traducidos=0;
 for(const {k,patient,resources:r} of matches){if(!patient||k===omitir||!r)continue;
  const lugar=SISTEMAS[k].establecimiento;
  for(const e of r.Encounter??[]){const ex=(n:string)=>e.extension?.find((i:any)=>i.url?.endsWith('encuentro-'+n))?.valueString??'No registrado';
   atenciones.push({id:`${k}|${e.id}`,fecha:e.period?.start?.slice(0,10)??'',fechaHora:e.period?.start??'',sistema:k,
    establecimiento:(e.serviceProvider?.display??lugar).replace(/ \(sede simulada\)$/,''),
    profesional:(e.participant?.[0]?.individual?.display??'No registrado').replace(/ \(profesional ficticio\)$/,''),
    motivo:e.reasonCode?.[0]?.text??'Consulta',diagnostico:e.diagnosis?.[0]?.condition?.display??'No registrado',
    tipo:e.type?.[0]?.text??'Atención',sintomas:ex('sintomas'),signos:ex('signos'),evaluacion:ex('evaluacion'),plan:ex('plan'),seguimiento:ex('seguimiento'),examenes:[],medicamentos:[]});
  }
  for(const e of [...r.Observation??[],...r.DiagnosticReport??[]]){const item=examen(e,k);if(item.codigoOriginal)traducidos++;examenes.push(item);}
  for(const x of r.MedicationStatement??[]){const text=x.medicationCodeableConcept?.text??'Medicamento';const ky=text.toLowerCase();if(!meds.has(ky))meds.set(ky,{nombre:text,fuentes:[]});
   meds.get(ky)!.fuentes.push({clave:k,lugar:x.informationSource?.display?.replace(/ \(simulado\)$/,'')??lugar,fecha:x.effectivePeriod?.start,fin:x.effectivePeriod?.end,estado:x.status});
  }
  for(const x of r.AllergyIntolerance??[]){const text=x.code?.text??'Alergia sin especificar',ky=text.toLowerCase();if(!alergias.has(ky))alergias.set(ky,{sustancia:text,reaccion:x.reaction?.[0]?.description??'No registrada',fuentes:[]});alergias.get(ky)!.fuentes.push({clave:k,lugar});}
  for(const x of r.Condition??[]){const ky=x.code?.coding?.[0]?.code??x.id;if(!condiciones.has(ky))condiciones.set(ky,{codigo:ky,nombre:x.code?.text??'Condición sin especificar',fuentes:[]});condiciones.get(ky)!.fuentes.push({clave:k,lugar,fecha:x.recordedDate?.slice(0,10)});}
 }
 const porId=new Map(atenciones.map(a=>[a.id,a]));
 for(const e of examenes)porId.get(`${e.sistema}|${e.encuentro}`)?.examenes.push(e);
 for(const {k,resources:r} of matches){if(!r||k===omitir)continue;for(const med of r.MedicationStatement??[]){const id=med.context?.reference?.split('/').pop();porId.get(`${k}|${id}`)?.medicamentos.push(med.medicationCodeableConcept?.text??'No registrado');}}
 atenciones.sort((a,b)=>b.fechaHora.localeCompare(a.fechaHora));examenes.sort((a,b)=>b.fecha.localeCompare(a.fecha));
 return {
  dni,nombre:`${principal.name[0].given.join(' ')} ${principal.name[0].family}`,sexo:principal.gender,edad:edad(principal.birthDate),
  establecimientos:matches.filter(m=>m.patient||m.k===omitir).map(m=>({clave:m.k,idLocal:m.k===omitir?null:m.patient?.id??null,estado:m.k===omitir?'no_disponible':m.patient?'ok':'sin_registro'})),
  condiciones:[...condiciones.values()],alergias:[...alergias.values()],medicamentos:[...meds.values()],examenes,atenciones,
  repetidos:alertasPrevias(examenes),traza:{total:0,sistemas:matches.map(m=>({clave:m.k,peticiones:m.patient?7:1,ms:0,estado:m.k===omitir?'no_disponible':m.patient?'ok':'sin_registro',error:m.k===omitir?'Caída simulada':null,examenes:examenes.filter(x=>x.sistema===m.k).length})),examenes:examenes.length,traducidos}
 };
}
export const catalogoExamenes=()=>Object.entries(EXAMENES).map(([codigo,e])=>({codigo,nombre:e.nombre,tipo:e.tipo,unidad:e.unidad,referencia:e.referencia,fuente:e.fuente,nota:e.nota}));
