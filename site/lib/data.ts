// @ts-nocheck
// Datos del prototipo: tres sistemas de historia clínica simulados y pacientes ficticios.
// Sedes referenciales de SJL: nombres reales o aportados por el equipo, NO conectados. Pacientes, médicos y registros 100% sintéticos.

import { EXAMENES, interpretarResultado } from "./catalogo-clinico";
import { SEDES_SJL } from "./establecimientos-sjl";

export type Clave = "minsa" | "essalud" | "clinica";
export interface Sistema {
  nombre: string; corto: string; prefijo: string; establecimiento: string; cod: string;
  categoria: string; distrito: string; latencia: [number, number];
}

export const DNI_SYSTEM = "urn:demo-peru:identificador-paciente-dni-sintetico";
export const LOINC = "http://loinc.org";
export const CLINICA_LOCAL = "urn:demo-sjl:codigos-laboratorio-privado";

export const SISTEMAS: Record<Clave, Sistema> = {
  minsa: {
    nombre: "Minsa SIHCE", corto: "Minsa", prefijo: "SIHCE",
    establecimiento: "Hospital San Juan de Lurigancho (simulado)", cod: "DEMO-SJL-001", categoria: "Demostración", distrito: "San Juan de Lurigancho",
    latencia: [90, 170],
  },
  essalud: {
    nombre: "EsSalud ESSI", corto: "EsSalud", prefijo: "ESSI",
    establecimiento: "Hospital EsSalud Aurelio Díaz Ufano (simulado)", cod: "DEMO-SJL-002", categoria: "Demostración", distrito: "San Juan de Lurigancho",
    latencia: [140, 260],
  },
  clinica: {
    nombre: "Clínica privada", corto: "Clínica", prefijo: "CLX",
    establecimiento: "Clínica San Juan Bautista (simulada)", cod: "DEMO-SJL-003", categoria: "Demostración", distrito: "San Juan de Lurigancho",
    latencia: [70, 150],
  },
};

// código LOINC -> [nombre, ventana en días, tipo]. La ventana es un parámetro de demostración, no un criterio clínico.
export const CATALOGO: Record<string, [string, number, string]> = Object.fromEntries(
  Object.entries(EXAMENES).map(([codigo, e]) => [codigo, [e.nombre,e.dias,e.tipo]]),
);

// La clínica usa códigos propios: la capa de interoperabilidad los traduce a LOINC.
export const LOCAL_A_LOINC: Record<string, string> = {
  "CLX-GLU": "2345-7", "CLX-HBA1C": "4548-4", "CLX-HB": "718-7", "CLX-CREA": "2160-0", "CLX-COL": "2093-3",
  "CLX-TG": "2571-8", "CLX-ECG": "11524-6", "CLX-RXTOR": "36643-5", "CLX-ECOABD": "24558-9",
};
export const LOINC_A_LOCAL = Object.fromEntries(Object.entries(LOCAL_A_LOINC).map(([k, v]) => [v, k]));

// ---------- utilidades ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Fecha fija para que el mismo caso sintético no cambie tras cada despliegue o reinicio.
const HOY = new Date('2026-10-29T12:00:00-05:00');
export const hoyISO = () => HOY.toISOString().slice(0, 10);
const haceDias = (n) => {
  const d = new Date(HOY);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

const fechaMasDias = (fecha, dias) => {
  const d = new Date(`${fecha}T12:00:00Z`); d.setUTCDate(d.getUTCDate()+dias);
  return d.toISOString().slice(0,10);
};
const MEDICOS_DEMO = [
  'Dra. Elena Flores Rojas', 'Dr. Javier Huamán Soto', 'Dra. Patricia Mendoza Salas',
  'Dr. Carlos Rivera Paredes', 'Dra. Verónica Torres Mamani', 'Dr. Andrés Chávez Ramos',
];
function sedeDe(clave, dni, dias) {
  const red = clave==='clinica'?'privada':clave;
  const sedes = SEDES_SJL.filter(s=>s.red===red);
  const n = [...dni].reduce((a,c)=>a+Number(c),0) + dias;
  return sedes[n%sedes.length];
}
function valorCoherente(codigo, spec, r) {
  const def = EXAMENES[codigo];
  const tiene = (c) => spec.condiciones.some(x=>x[0]===c);
  const en = (a,b) => Math.round((a+r()*(b-a))*10)/10;
  if (tiene('E11') && codigo==='2345-7') return en(128,205);
  if (tiene('E11') && codigo==='4548-4') return en(6.6,9.1);
  if (tiene('D50') && codigo==='718-7') return en(9.2,11.7);
  if (tiene('E78') && codigo==='2571-8') return en(170,295);
  if (tiene('E78') && codigo==='2093-3') return en(208,267);
  if (codigo==='2085-9') return en(34,68);
  if (codigo==='13457-7') return en(78,157);
  return en(def.min ?? 1,def.max ?? 10);
}
// ---------- recursos FHIR R4 (subconjunto) ----------
const ref = (pid) => ({ reference: `Patient/${pid}` });
const coding = (codigo, display, local) => ({ system: local ? CLINICA_LOCAL : LOINC, code: codigo, display });

const fhir = {
  encounter: (id, pid, fecha, sede, medico, motivo, diagnostico, narrativa) => ({
    resourceType:'Encounter', id, status:'finished', class:{system:'http://terminology.hl7.org/CodeSystem/v3-ActCode',code:'AMB',display:'Ambulatorio'},
    subject:ref(pid), period:{start:`${fecha}T09:25:00-05:00`,end:`${fecha}T10:05:00-05:00`},
    serviceProvider:{display:`${sede.nombre} (sede simulada)`},
    participant:[{individual:{display:`${medico} (profesional ficticio)`}}],
    reasonCode:[{text:motivo}],
    type:[{text:'Consulta externa - demostración'}],
    diagnosis: diagnostico ? [{condition:{display:diagnostico},rank:1}] : [],
    extension:Object.entries(narrativa ?? {}).map(([clave,valor])=>({
      url:`https://demo-sjl.example/fhir/StructureDefinition/encuentro-${clave}`,valueString:valor,
    })),
  }),
  patient: (id, dni, nombres, apellidos, sexo, nacimiento) => ({
    resourceType: "Patient", id,
    identifier: [{ system: DNI_SYSTEM, value: dni }],
    name: [{ use: "official", family: apellidos, given: nombres.split(" ") }],
    gender: sexo, birthDate: nacimiento,
  }),
  observation: (id, pid, codigo, display, valor, unidad, fecha, org, local, encuentro) => ({
    resourceType: "Observation", id, status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
    code: { coding: [coding(codigo, display, local)], text: display },
    subject: ref(pid), effectiveDateTime: `${fecha}T10:20:00-05:00`, issued: `${fecha}T13:10:00-05:00`,
    encounter: {reference:`Encounter/${encuentro}`}, performer: [{ display: `${org} (simulado)` }],
    specimen: {display:EXAMENES[local ? LOCAL_A_LOINC[codigo] : codigo]?.muestra ?? 'Muestra documentada'},
    valueQuantity: { value: valor, unit: unidad, system: "http://unitsofmeasure.org", code: EXAMENES[local ? LOCAL_A_LOINC[codigo] : codigo]?.ucum ?? unidad },
    referenceRange: [{text: EXAMENES[local ? LOCAL_A_LOINC[codigo] : codigo]?.referencia ?? 'Según laboratorio emisor'}],
    note: [{text: interpretarResultado(local ? LOCAL_A_LOINC[codigo] : codigo,valor).texto}],
  }),
  report: (id, pid, codigo, display, conclusion, fecha, org, local, encuentro) => ({
    resourceType: "DiagnosticReport", id, status: "final",
    code: { coding: [coding(codigo, display, local)], text: display },
    subject: ref(pid), encounter: {reference:`Encounter/${encuentro}`}, effectiveDateTime: `${fecha}T10:20:00-05:00`, issued: `${fecha}T13:10:00-05:00`, performer: [{ display: `${org} (simulado)` }], conclusion,
  }),
  medication: (id, pid, texto, fecha, org, encuentro, duracion) => ({
    resourceType: "MedicationStatement", id,
    status: duracion === null ? 'active' : (new Date(`${fecha}T12:00:00Z`).getTime() + duracion*86400000 < HOY.getTime() ? 'completed' : 'active'),
    medicationCodeableConcept: { text: texto }, subject: ref(pid),
    context: {reference:`Encounter/${encuentro}`},
    effectivePeriod: { start: fecha, ...(duracion===null? {} : {end: fechaMasDias(fecha,duracion)}) },
    dosage: [{text: texto}],
    informationSource: { display: `${org} (simulado)` },
  }),
  allergy: (id, pid, sustancia, reaccion, org) => ({
    resourceType: "AllergyIntolerance", id,
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical", code: "active" }] },
    code: { text: sustancia }, patient: ref(pid),
    reaction: [{ manifestation: [{ text: reaccion }], description: reaccion }], recorder: { display: org },
  }),
  condition: (id, pid, cie10, texto, org) => ({
    resourceType: "Condition", id,
    clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active" }] },
    code: { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: cie10, display: texto }], text: texto },
    subject: ref(pid), recorder: { display: org },
    // Fecha del diagnóstico: determinista por paciente y código, entre 5 meses y 4 años atrás.
    recordedDate: haceDias(150 + ([...(pid + cie10)].reduce((a, c) => a + c.charCodeAt(0), 0) % 1300)),
  }),
};

export const TIPOS: string[] = ["Encounter", "Observation", "DiagnosticReport", "MedicationStatement", "AllergyIntolerance", "Condition"];

function nuevoStore(clave) {
  return { clave, enLinea: true, n: 0, pacientes: new Map(), recursos: new Map() };
}
const idNuevo = (st, tipo) => `${SISTEMAS[st.clave].prefijo}-${tipo.slice(0, 3).toUpperCase()}-${String(++st.n).padStart(6, "0")}`;
function agregarPaciente(st, pid, recurso) {
  st.pacientes.set(pid, recurso);
  st.recursos.set(pid, Object.fromEntries(TIPOS.map((t) => [t, []])));
}
const agregar = (st, pid, recurso) => st.recursos.get(pid)[recurso.resourceType].push(recurso);

// ---------- pacientes de demostración ----------
export const CASOS = [
  {
    dni: "90000001", nombres: "Marta", apellidos: "Quispe Ramos", sexo: "female", nacimiento: "1968-03-14",
    consentimiento: true, sistemas: ["minsa", "essalud"],
    titulo: "Dos sistemas, dos repeticiones",
    muestra: "Repite HbA1c y glucosa entre Minsa y EsSalud. Una alergia solo consta en un sistema.",
    condiciones: [["E11", "Diabetes mellitus tipo 2"], ["I10", "Hipertensión esencial"]],
    alergias: [["minsa", "Penicilina", "Erupción cutánea"]],
    medicamentos: [["minsa", "Metformina 850 mg c/12 h"], ["essalud", "Metformina 850 mg c/12 h"], ["essalud", "Enalapril 10 mg c/24 h"]],
    examenes: [["4548-4", 12, "essalud"], ["4548-4", 55, "minsa"], ["2345-7", 8, "essalud"], ["2345-7", 20, "minsa"], ["2571-8", 70, "minsa"]],
  },
  {
    dni: "90000002", nombres: "Luis", apellidos: "Huamán Torres", sexo: "male", nacimiento: "1975-09-02",
    consentimiento: true, sistemas: ["minsa", "clinica"],
    titulo: "Pedir un examen que ya existe",
    muestra: "Un ECG reciente en la clínica. Al intentar pedir otro, el visor avisa del duplicado.",
    condiciones: [["I10", "Hipertensión esencial"]],
    alergias: [["minsa", "Aspirina", "Urticaria"]],
    medicamentos: [["minsa", "Losartán 50 mg c/24 h"], ["clinica", "Losartán 50 mg c/24 h"]],
    examenes: [["11524-6", 9, "clinica"], ["11524-6", 21, "minsa"], ["2160-0", 15, "minsa"]],
  },
  {
    dni: "90000003", nombres: "Rosa", apellidos: "Chávez Delgado", sexo: "female", nacimiento: "1982-11-27",
    consentimiento: true, sistemas: ["minsa", "essalud"],
    titulo: "Referencia del Minsa a EsSalud",
    muestra: "La radiografía de tórax y la hemoglobina se repiten tras la derivación.",
    condiciones: [["J45", "Asma"], ["D50", "Anemia por deficiencia de hierro"]],
    alergias: [["essalud", "Sulfas", "Prurito"]],
    medicamentos: [["minsa", "Salbutamol inhalador a demanda"], ["essalud", "Sulfato ferroso 300 mg c/24 h"]],
    examenes: [["36643-5", 4, "essalud"], ["36643-5", 18, "minsa"], ["718-7", 6, "essalud"], ["718-7", 25, "minsa"]],
  },
  {
    dni: "90000004", nombres: "Jorge", apellidos: "Mendoza Paredes", sexo: "male", nacimiento: "1990-05-19",
    consentimiento: true, sistemas: ["minsa"],
    titulo: "Caso de control",
    muestra: "Un solo sistema y ningún examen repetido. El visor no inventa alertas.",
    condiciones: [["K29", "Gastritis"]], alergias: [],
    medicamentos: [["minsa", "Omeprazol 20 mg c/24 h"]],
    examenes: [["2345-7", 40, "minsa"], ["2093-3", 100, "minsa"]],
  },
  {
    dni: "90000005", nombres: "Carmen", apellidos: "Flores Salas", sexo: "female", nacimiento: "1959-01-30",
    consentimiento: false, sistemas: ["minsa", "essalud", "clinica"],
    titulo: "Sin consentimiento del paciente",
    muestra: "Tres sistemas, pero el acceso queda bloqueado hasta que ella autoriza.",
    condiciones: [["E11", "Diabetes mellitus tipo 2"], ["E78", "Dislipidemia"]],
    alergias: [["clinica", "Ibuprofeno", "Rinitis"]],
    medicamentos: [["minsa", "Metformina 850 mg c/12 h"], ["essalud", "Atorvastatina 20 mg c/24 h"], ["clinica", "Metformina 850 mg c/12 h"]],
    examenes: [["2093-3", 16, "clinica"], ["2093-3", 48, "minsa"], ["2571-8", 10, "essalud"], ["4548-4", 33, "minsa"], ["24558-9", 28, "essalud"]],
  },
  {
    dni: "90000006", nombres: "Pedro", apellidos: "Rojas Vega", sexo: "male", nacimiento: "1971-07-08",
    consentimiento: true, sistemas: ["essalud", "clinica"],
    titulo: "Códigos locales normalizados",
    muestra: "La clínica registra con códigos propios. La capa de interoperabilidad los traduce a LOINC.",
    condiciones: [["E11", "Diabetes mellitus tipo 2"]], alergias: [],
    medicamentos: [["essalud", "Metformina 850 mg c/12 h"], ["clinica", "Metformina 1000 mg c/12 h"]],
    examenes: [["4548-4", 14, "clinica"], ["4548-4", 40, "essalud"], ["2571-8", 30, "essalud"], ["24558-9", 22, "clinica"], ["24558-9", 60, "essalud"]],
  },
];

const NOMBRES_F = ["Marta", "Rosa", "Carmen", "Lucía", "Elena", "Julia", "Sofía", "Teresa", "Gladys", "Mirian"];
const NOMBRES_M = ["Luis", "Jorge", "Pedro", "Carlos", "Miguel", "Raúl", "Víctor", "Hugo", "César", "Julio"];
const APELLIDOS = ["Quispe", "Huamán", "Chávez", "Mendoza", "Flores", "Rojas", "Torres", "Ramos", "Vega", "Salas", "Paredes",
  "Delgado", "Condori", "Mamani", "Castillo", "Rivera", "Cruz", "Gutiérrez", "Alva", "Soto"];
const CONDICIONES = {
  hta: ["I10", "Hipertensión esencial", "Losartán 50 mg c/24 h", ["11524-6", "2160-0", "2093-3"]],
  dm2: ["E11", "Diabetes mellitus tipo 2", "Metformina 850 mg c/12 h", ["2345-7", "4548-4", "2571-8"]],
  dis: ["E78", "Dislipidemia", "Atorvastatina 20 mg c/24 h", ["2093-3", "2571-8"]],
  anemia: ["D50", "Anemia por deficiencia de hierro", "Sulfato ferroso 300 mg c/24 h", ["718-7"]],
  asma: ["J45", "Asma", "Salbutamol inhalador a demanda", ["36643-5"]],
  gastritis: ["K29", "Gastritis", "Omeprazol 20 mg c/24 h", ["24558-9"]],
};
const ALERGIAS = [["Aspirina", "Urticaria"], ["Penicilina", "Erupción cutánea"], ["Sulfas", "Prurito"], ["Ibuprofeno", "Rinitis"]];
const RANGOS = { "2345-7": [75, 190, "mg/dL"], "4548-4": [5.2, 9.5, "%"], "718-7": [9.5, 15.5, "g/dL"], "2160-0": [0.6, 1.5, "mg/dL"],
  "2093-3": [150, 260, "mg/dL"], "2571-8": [90, 280, "mg/dL"] };
const TEXTOS = {
  "11524-6": ["Ritmo sinusal, sin alteraciones agudas", "Ritmo sinusal, signos de hipertrofia ventricular izquierda"],
  "36643-5": ["Campos pulmonares sin infiltrados", "Hallazgos inespecíficos, sin consolidación"],
  "24558-9": ["Hígado de tamaño normal, sin litiasis", "Esteatosis hepática leve"],
};

function aleatorio(i, r) {
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const entre = (a, b) => a + Math.floor(r() * (b - a + 1));
  const sexo = r() < 0.5 ? "female" : "male";
  const claves = Object.keys(SISTEMAS);
  const orden = [...claves].sort(() => r() - 0.5);
  const sistemas = orden.slice(0, pick([1, 2, 2, 3]));
  const keys = Object.keys(CONDICIONES).sort(() => r() - 0.5).slice(0, pick([1, 2]));
  const alergias = r() < 0.4 ? [[pick(sistemas), ...pick(ALERGIAS)]] : [];
  const codigos = [...new Set(keys.flatMap((k) => CONDICIONES[k][3]))].sort();
  const examenes = [];
  for (const c of codigos) {
    const ventana = CATALOGO[c][1];
    const sis = pick(sistemas);
    const dias = entre(3, 120);
    examenes.push([c, dias, sis]);
    const otros = sistemas.filter((s) => s !== sis);
    if (otros.length && r() < 0.45) examenes.push([c, Math.min(120, dias + entre(3, Math.max(4, Math.floor(ventana * 0.7)))), pick(otros)]);
  }
  return {
    dni: String(90000007 + i), nombres: pick(sexo === "female" ? NOMBRES_F : NOMBRES_M),
    apellidos: `${pick(APELLIDOS)} ${pick(APELLIDOS)}`, sexo,
    nacimiento: `${entre(1948, 2003)}-${String(entre(1, 12)).padStart(2, "0")}-${String(entre(1, 28)).padStart(2, "0")}`,
    consentimiento: true, sistemas,
    condiciones: keys.map((k) => [CONDICIONES[k][0], CONDICIONES[k][1]]),
    alergias, medicamentos: keys.map((k) => [pick(sistemas), CONDICIONES[k][2]]), examenes,
  };
}

function cargar(stores, spec, r) {
  const locales = {};
  const encuentros = {};
  const diagnostico = spec.condiciones.map(x=>x[1]).join(' · ') || 'Control médico';
  const cie = spec.condiciones.map(x=>x[0]);
  const narrativa = {
    sintomas: cie.includes('D50') ? 'Cansancio referido durante control; se revisan antecedentes.' : cie.includes('J45') ? 'Control de síntomas respiratorios y respuesta al tratamiento previo.' : cie.includes('E11') ? 'Consulta de control metabólico; revisión de síntomas y adherencia documentada.' : 'Consulta de seguimiento según antecedentes existentes.',
    signos: cie.includes('I10') ? 'PA 142/88 mmHg · FC 78 lpm · temperatura 36,6 °C (datos sintéticos)' : 'PA 122/78 mmHg · FC 76 lpm · temperatura 36,7 °C (datos sintéticos)',
    evaluacion: `Seguimiento ambulatorio ficticio de ${diagnostico}. Se revisan estudios previos y tratamientos registrados.`,
    plan: 'Evaluar resultados de pruebas solicitadas y continuidad del tratamiento documentado; indicación clínica simulada.',
    seguimiento: 'Control clínico indicado en 30 días (escenario académico, no es una cita real).',
  };
  for (const clave of spec.sistemas) {
    const st = stores[clave];
    const pid = `${SISTEMAS[clave].prefijo}-PAC-${10000 + Math.floor(r() * 89999)}`;
    locales[clave] = pid;
    encuentros[clave] = [];
    agregarPaciente(st, pid, fhir.patient(pid, spec.dni, spec.nombres, spec.apellidos, spec.sexo, spec.nacimiento));
    if (clave === spec.sistemas[0]) {
      for (const [cie, texto] of spec.condiciones) agregar(st, pid, fhir.condition(idNuevo(st, 'Condition'), pid, cie, texto, SISTEMAS[clave].establecimiento));
    }
  }
  for (const [clave, sust, reac] of spec.alergias) {
    const st = stores[clave];
    agregar(st, locales[clave], fhir.allergy(idNuevo(st, 'AllergyIntolerance'), locales[clave], sust, reac, SISTEMAS[clave].establecimiento));
  }
  // Relacionar varias pruebas del mismo día/establecimiento con una misma atención.
  const porAtencion = new Map();
  for (const [codigo, dias, clave] of spec.examenes) {
    const st = stores[clave]; const pid = locales[clave];
    const def = EXAMENES[codigo]; if (!def) continue;
    const fecha = haceDias(dias);
    const key = `${clave}|${fecha}`;
    let at = porAtencion.get(key);
    if (!at) {
      const sede = sedeDe(clave, spec.dni, dias);
      const medico = MEDICOS_DEMO[(Number(spec.dni.slice(-2)) + dias)%MEDICOS_DEMO.length];
      const id = idNuevo(st, 'Encounter');
      const razon = `Control y evaluación: ${diagnostico}. Estudio solicitado: ${def.nombre}.`;
      agregar(st, pid, fhir.encounter(id,pid,fecha,sede,medico,razon,diagnostico,narrativa));
      at = {id,fecha,sede}; porAtencion.set(key,at); encuentros[clave].push(at);
    }
    const org = at.sede.nombre;
    const local = clave==='clinica' && Boolean(LOINC_A_LOCAL[codigo]);
    const cod = local ? LOINC_A_LOCAL[codigo] : codigo;
    if (def.unidad) {
      agregar(st,pid,fhir.observation(idNuevo(st,'Observation'),pid,cod,def.nombre,valorCoherente(codigo,spec,r),def.unidad,fecha,org,local,at.id));
    } else {
      const t = TEXTOS[codigo] ?? ['Informe realizado; hallazgos disponibles en documento clínico sintético'];
      agregar(st,pid,fhir.report(idNuevo(st,'DiagnosticReport'),pid,cod,def.nombre,t[Math.floor(r()*t.length)],fecha,org,local,at.id));
    }
  }
  // Asociar cada tratamiento a una atención. Si no había exámenes, crear consulta.
  for (const [clave, texto, indice] of spec.medicamentos.map((m,i)=>[...m,i])) {
    const st = stores[clave]; const pid = locales[clave];
    let at = encuentros[clave].slice().sort((a,b)=>b.fecha.localeCompare(a.fecha))[0];
    if (!at) {
      const dias = 9+Number(indice)*12;
      const fecha = haceDias(dias);
      const sede = sedeDe(clave,spec.dni,dias);
      const id = idNuevo(st,'Encounter');
      const medico = MEDICOS_DEMO[(Number(spec.dni.slice(-2))+dias)%MEDICOS_DEMO.length];
      agregar(st,pid,fhir.encounter(id,pid,fecha,sede,medico,`Consulta por ${diagnostico}; tratamiento indicado.`,diagnostico,narrativa));
      at = {id,fecha,sede}; encuentros[clave].push(at);
    }
    const duracion = /metformina|losartán|enalapril|atorvastatina|salbutamol/i.test(texto) ? null : 30;
    agregar(st,pid,fhir.medication(idNuevo(st,'MedicationStatement'),pid,texto,at.fecha,at.sede.nombre,at.id,duracion));
  }
  // Fuente incluida sin examen/receta: dejar explícita su consulta de control sintética.
  for (const clave of spec.sistemas) {
    if (encuentros[clave].length) continue;
    const st=stores[clave],pid=locales[clave],dias=28;
    const fecha=haceDias(dias),sede=sedeDe(clave,spec.dni,dias);
    const medico=MEDICOS_DEMO[(Number(spec.dni.slice(-2))+dias)%MEDICOS_DEMO.length];
    agregar(st,pid,fhir.encounter(idNuevo(st,'Encounter'),pid,fecha,sede,medico,
      'Consulta de seguimiento. Sin exámenes o recetas adicionales documentados en la fuente simulada.',diagnostico,narrativa));
  }
}

export function construirDataset(semilla = 2026, total = 24) {
  const r = mulberry32(semilla);
  const stores = Object.fromEntries(Object.keys(SISTEMAS).map((c) => [c, nuevoStore(c)]));
  const specs = [...CASOS, ...Array.from({ length: total - CASOS.length }, (_, i) => aleatorio(i, r))].map((s,i)=>({
    ...s, examenes:[...s.examenes, ...(i<6 ? [
      ['6690-2', 7+i*2, s.sistemas[0]], ['777-3',7+i*2,s.sistemas[0]],
      ['4544-3',7+i*2,s.sistemas[0]], ['2085-9',16+i*3,s.sistemas[0]],
      ['13457-7',16+i*3,s.sistemas[0]], ['2951-2',11+i*2,s.sistemas[0]],
      ['2823-3',11+i*2,s.sistemas[0]], ['1742-6',40+i,s.sistemas[0]],
      ['1920-8',40+i,s.sistemas[0]], ['3016-3',44+i,s.sistemas[0]],
    ]:[])]
  }));
  for (const spec of specs) cargar(stores, spec, r);
  return { stores, pacientes: specs.map((s) => ({ dni: s.dni, nombre: `${s.nombres} ${s.apellidos}`, sistemas: s.sistemas, consentimiento: s.consentimiento, titulo: s.titulo, muestra: s.muestra })) };
}

export { haceDias };
