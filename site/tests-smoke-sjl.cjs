const ts = require('typescript');
const fs = require('fs');
require.extensions['.ts'] = function(module,filename){
 const source = fs.readFileSync(filename,'utf8');
 const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 module._compile(js, filename);
};
const assert = require('assert');
const {construirDataset, SISTEMAS,TIPOS} = require('./lib/data.ts');
const { SEDES_SJL } = require('./lib/establecimientos-sjl.ts');
const {EXAMENES} = require('./lib/catalogo-clinico.ts');
const {stores,pacientes} = construirDataset();
assert(pacientes.length===24,'24 pacientes');
assert(SEDES_SJL.length>=30,'directorio SJL');
assert(Object.keys(EXAMENES).length>=20,'exámenes');
let total=0, ex=0;
for(const [clave,st] of Object.entries(stores)){
 for(const [id,tipos] of st.recursos){
   assert(tipos.Encounter.length,'cada paciente debe tener al menos una atención');
   total+=tipos.Encounter.length;ex+=tipos.Observation.length+tipos.DiagnosticReport.length;
   const encIds=new Set(tipos.Encounter.map(x=>x.id));
   for(const o of [...tipos.Observation,...tipos.DiagnosticReport]){
     assert(encIds.has(o.encounter.reference.split('/')[1]),'examen debe relacionarse a un encuentro');
     assert(o.performer[0].display.includes('simulad'),'fuente sintética');
     if(o.resourceType==='Observation'){
       assert(o.valueQuantity.system==='http://unitsofmeasure.org');
       assert(o.referenceRange?.[0]?.text);
     }
   }
   for(const med of tipos.MedicationStatement){assert(encIds.has(med.context.reference.split('/')[1]),'medicación relacionada a atención');}
 }
}
assert(total>ex/5,'registros');
console.log(`OK: ${pacientes.length} pacientes, ${SEDES_SJL.length} sedes referenciales, ${Object.keys(EXAMENES).length} exámenes, ${total} atenciones, ${ex} resultados.`);

// Prueba de integración del gateway con transporte HTTP simulado.
(async()=>{
 const {consultaFhir}=require('./lib/fhir-server.ts');
 const memoria=new Map();
 global.localStorage={getItem:k=>memoria.get(k)??null,setItem:(k,v)=>memoria.set(k,v)};
 global.fetch=async url=>{
  const parsed=new URL(url,'http://localhost:3000');
  const [,api,fhir,clave,tipo]=parsed.pathname.split('/');
  if(api!=='api'||fhir!=='fhir') return {ok:false,status:404};
  const bundle=await consultaFhir(clave,tipo,Object.fromEntries(parsed.searchParams));
  return {ok:true,status:200,json:async()=>bundle};
 };
 const {api}=require('./lib/gateway.ts');
 const resumen=await api.resumen('90000001');
 assert(resumen.atenciones.length>=5,'resumen por atenciones');
 assert(resumen.examenes.length>=10,'resumen de resultados enriquecido');
 assert(resumen.atenciones.some(x=>x.examenes.length>0),'atención vinculada a examen');
 assert(resumen.atenciones.every(x=>x.sintomas&&x.signos&&x.profesional&&x.establecimiento));
 assert(resumen.medicamentos.length>0);
 let bloqueado=false;
 try{await api.resumen('90000005');}catch(e){bloqueado=e.codigo==='sin_consentimiento';}
 assert(bloqueado,'caso sin consentimiento debe bloquearse');
 console.log('OK: Gateway unifica encuentros, exámenes y tratamientos; bloqueo por consentimiento simulado.');
})().catch(e=>{console.error(e);process.exitCode=1;});
