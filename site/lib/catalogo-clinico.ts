/** Catálogo docente: NO constituye reglas clínicas de diagnóstico ni informe real.
 * Valores de referencia orientativos de adultos. Cuando un laboratorio emita intervalos
 * particulares por método, sexo, edad o embarazo, DEBEN prevalecer sobre este catálogo.
 * Solo A1c, glucosa en ayunas y perfil lipídico presentan categorías orientativas de guías.
 */
export type ExamenDef = { nombre:string; tipo:'laboratorio'|'imagen'|'gabinete'; dias:number; unidad?:string; ucum?:string;
  muestra?:string; referencia?:string; min?:number; max?:number; fuente:string; nota?:string };
const ADA = 'https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diab';
const LIP = 'https://medlineplus.gov/spanish/pruebas-de-laboratorio/niveles-de-colesterol/';
const LAB = 'https://medlineplus.gov/spanish/pruebas-de-laboratorio/como-entender-sus-resultados-de-pruebas-de-laboratorio/';
export const EXAMENES: Record<string,ExamenDef> = {
 '2345-7': {nombre:'Glucosa plasmática en ayunas',tipo:'laboratorio',dias:30,unidad:'mg/dL',ucum:'mg/dL',muestra:'Plasma venoso; ayuno ≥8 h',referencia:'<100 mg/dL (criterio ADA)',min:70,max:99,fuente:ADA,nota:'100–125 mg/dL: intervalo de prediabetes; ≥126 mg/dL: criterio de diabetes que requiere confirmación salvo excepciones.'},
 '4548-4': {nombre:'Hemoglobina glicosilada (HbA1c)',tipo:'laboratorio',dias:90,unidad:'%',ucum:'%',muestra:'Sangre total',referencia:'<5,7 % (criterio ADA)',min:4.0,max:5.6,fuente:ADA,nota:'5,7–6,4 %: prediabetes; ≥6,5 %: criterio diagnóstico a confirmar, con método estandarizado y sin condiciones que lo invaliden.'},
 '718-7': {nombre:'Hemoglobina',tipo:'laboratorio',dias:30,unidad:'g/dL',ucum:'g/dL',muestra:'Sangre total',referencia:'Intervalo depende de sexo, edad y laboratorio',min:12,max:17,fuente:LAB,nota:'La interpretación requiere rangos propios del laboratorio y contexto clínico.'},
 '4544-3': {nombre:'Hematocrito',tipo:'laboratorio',dias:30,unidad:'%',ucum:'%',muestra:'Sangre total',referencia:'Según sexo, edad y laboratorio',min:36,max:50,fuente:LAB},
 '6690-2': {nombre:'Leucocitos',tipo:'laboratorio',dias:14,unidad:'10³/µL',ucum:'10*3/uL',muestra:'Sangre total',referencia:'Intervalo específico del laboratorio',min:4.0,max:11.0,fuente:LAB},
 '777-3': {nombre:'Plaquetas',tipo:'laboratorio',dias:14,unidad:'10³/µL',ucum:'10*3/uL',muestra:'Sangre total',referencia:'Intervalo específico del laboratorio',min:150,max:450,fuente:LAB},
 '2160-0': {nombre:'Creatinina sérica',tipo:'laboratorio',dias:30,unidad:'mg/dL',ucum:'mg/dL',muestra:'Suero',referencia:'Según edad, sexo y laboratorio',min:0.6,max:1.2,fuente:'https://medlineplus.gov/spanish/pruebas-de-laboratorio/prueba-de-creatinina/'},
 '3094-0': {nombre:'Urea nitrogenada (BUN)',tipo:'laboratorio',dias:30,unidad:'mg/dL',ucum:'mg/dL',muestra:'Suero',referencia:'Intervalo específico del laboratorio',min:7,max:20,fuente:LAB},
 '2951-2': {nombre:'Sodio',tipo:'laboratorio',dias:14,unidad:'mmol/L',ucum:'mmol/L',muestra:'Suero',referencia:'Intervalo específico del laboratorio',min:135,max:145,fuente:LAB},
 '2823-3': {nombre:'Potasio',tipo:'laboratorio',dias:14,unidad:'mmol/L',ucum:'mmol/L',muestra:'Suero',referencia:'Intervalo específico del laboratorio',min:3.5,max:5.1,fuente:LAB},
 '2093-3': {nombre:'Colesterol total',tipo:'laboratorio',dias:90,unidad:'mg/dL',ucum:'mg/dL',muestra:'Suero',referencia:'Deseable <200 mg/dL en adultos',min:100,max:199,fuente:LIP,nota:'El objetivo individual depende del riesgo cardiovascular.'},
 '2571-8': {nombre:'Triglicéridos',tipo:'laboratorio',dias:90,unidad:'mg/dL',ucum:'mg/dL',muestra:'Suero',referencia:'Normal <150 mg/dL en adultos',min:45,max:149,fuente:'https://medlineplus.gov/spanish/pruebas-de-laboratorio/prueba-de-trigliceridos/',nota:'150–199: limítrofe; 200–499: alto; ≥500: muy alto. No diagnostica por sí solo.'},
 '2085-9': {nombre:'Colesterol HDL',tipo:'laboratorio',dias:90,unidad:'mg/dL',ucum:'mg/dL',muestra:'Suero',referencia:'Bajo: <40 (hombre), <50 (mujer) mg/dL',min:40,max:75,fuente:LIP},
 '13457-7': {nombre:'Colesterol LDL calculado',tipo:'laboratorio',dias:90,unidad:'mg/dL',ucum:'mg/dL',muestra:'Suero',referencia:'Meta según riesgo; general <100 mg/dL',min:55,max:130,fuente:LIP},
 '1742-6': {nombre:'Alanina aminotransferasa (ALT/TGP)',tipo:'laboratorio',dias:30,unidad:'U/L',ucum:'U/L',muestra:'Suero',referencia:'Según método, sexo y laboratorio',min:8,max:45,fuente:LAB},
 '1920-8': {nombre:'Aspartato aminotransferasa (AST/TGO)',tipo:'laboratorio',dias:30,unidad:'U/L',ucum:'U/L',muestra:'Suero',referencia:'Según método, sexo y laboratorio',min:8,max:40,fuente:LAB},
 '1975-2': {nombre:'Bilirrubina total',tipo:'laboratorio',dias:30,unidad:'mg/dL',ucum:'mg/dL',muestra:'Suero',referencia:'Intervalo específico del laboratorio',min:0.2,max:1.2,fuente:LAB},
 '3016-3': {nombre:'Hormona estimulante tiroidea (TSH)',tipo:'laboratorio',dias:90,unidad:'m[IU]/L',ucum:'m[IU]/L',muestra:'Suero',referencia:'Según edad, embarazo y laboratorio',min:0.4,max:4.0,fuente:LAB},
 '11524-6': {nombre:'Electrocardiograma (ECG)',tipo:'gabinete',dias:30,fuente:'https://hl7.org/fhir/R4/diagnosticreport.html'},
 '36643-5': {nombre:'Radiografía de tórax',tipo:'imagen',dias:90,fuente:'https://hl7.org/fhir/R4/diagnosticreport.html'},
 '24558-9': {nombre:'Ecografía abdominal',tipo:'imagen',dias:90,fuente:'https://hl7.org/fhir/R4/diagnosticreport.html'},
};
export function interpretarResultado(codigo:string, valor:number): {estado:'orientativo'|'revisar'; texto:string} {
 if (codigo==='2345-7') return {estado:valor>=100?'revisar':'orientativo',texto:valor>=126?'Criterio de diabetes en ayunas; requiere evaluación y, por lo general, confirmación':valor>=100?'Intervalo de prediabetes en ayunas (ADA)':'Debajo del umbral de prediabetes (ADA)'};
 if (codigo==='4548-4') return {estado:valor>=5.7?'revisar':'orientativo',texto:valor>=6.5?'Criterio de diabetes; requiere evaluación y, generalmente, confirmación':valor>=5.7?'Intervalo de prediabetes (ADA)':'Debajo del umbral de prediabetes (ADA)'};
 if (codigo==='2571-8') return {estado:valor>=150?'revisar':'orientativo',texto:valor>=500?'Triglicéridos muy altos':valor>=200?'Triglicéridos altos':valor>=150?'Triglicéridos limítrofes':'Dentro de categoría normal general'};
 if (codigo==='2093-3') return {estado:valor>=200?'revisar':'orientativo',texto:valor>=240?'Colesterol total alto':valor>=200?'Colesterol total limítrofe':'Valor deseable general para adultos'};
 return {estado:'orientativo',texto:'Interpretación individual a cargo del profesional; revisar rango del laboratorio emisor.'};
}
