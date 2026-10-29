// Datos del prototipo: tres sistemas de historia clínica simulados y pacientes ficticios.
// Los establecimientos son reales (RENIPRESS, SUSALUD, sep. 2026). Los pacientes y sus registros son inventados.

export const DNI_SYSTEM = "https://www.reniec.gob.pe/dni";
export const LOINC = "http://loinc.org";
export const CLINICA_LOCAL = "urn:clinica-chorrillos:codigos-locales";

export const SISTEMAS = {
  minsa: {
    nombre: "Minsa SIHCE", corto: "Minsa", prefijo: "SIHCE",
    establecimiento: "C.S. Carlos A. Protzel", cod: "00005763", categoria: "I-3", distrito: "Comas",
    latencia: [90, 170],
  },
  essalud: {
    nombre: "EsSalud ESSI", corto: "EsSalud", prefijo: "ESSI",
    establecimiento: "Policlínico Pablo Bermúdez", cod: "00008711", categoria: "I-3", distrito: "Jesús María",
    latencia: [140, 260],
  },
  clinica: {
    nombre: "Clínica privada", corto: "Clínica", prefijo: "CLX",
    establecimiento: "Clínica Chorrillos", cod: "00011950", categoria: "II-1", distrito: "Chorrillos",
    latencia: [70, 150],
  },
};

// código LOINC -> [nombre, ventana en días, tipo]. La ventana es un parámetro de demostración, no un criterio clínico.
export const CATALOGO = {
  "2345-7": ["Glucosa en suero", 30, "laboratorio"],
  "4548-4": ["Hemoglobina glicosilada (HbA1c)", 90, "laboratorio"],
  "718-7": ["Hemoglobina", 30, "laboratorio"],
  "2160-0": ["Creatinina en suero", 30, "laboratorio"],
  "2093-3": ["Colesterol total", 90, "laboratorio"],
  "2571-8": ["Triglicéridos", 90, "laboratorio"],
  "11524-6": ["Electrocardiograma (ECG)", 30, "gabinete"],
  "36643-5": ["Radiografía de tórax", 90, "imagen"],
  "24558-9": ["Ecografía abdominal", 90, "imagen"],
};

// La clínica usa códigos propios: la capa de interoperabilidad los traduce a LOINC.
export const LOCAL_A_LOINC = {
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
const HOY = new Date();
HOY.setHours(12, 0, 0, 0);
export const hoyISO = () => HOY.toISOString().slice(0, 10);
const haceDias = (n) => {
  const d = new Date(HOY);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};

// ---------- recursos FHIR R4 (subconjunto) ----------
const ref = (pid) => ({ reference: `Patient/${pid}` });
const coding = (codigo, display, local) => ({ system: local ? CLINICA_LOCAL : LOINC, code: codigo, display });

const fhir = {
  patient: (id, dni, nombres, apellidos, sexo, nacimiento) => ({
    resourceType: "Patient", id,
    identifier: [{ system: DNI_SYSTEM, value: dni }],
    name: [{ use: "official", family: apellidos, given: nombres.split(" ") }],
    gender: sexo, birthDate: nacimiento,
  }),
  observation: (id, pid, codigo, display, valor, unidad, fecha, org, local) => ({
    resourceType: "Observation", id, status: "final",
    category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "laboratory" }] }],
    code: { coding: [coding(codigo, display, local)], text: display },
    subject: ref(pid), effectiveDateTime: fecha, performer: [{ display: org }],
    valueQuantity: { value: valor, unit: unidad, system: "http://unitsofmeasure.org", code: unidad },
  }),
  report: (id, pid, codigo, display, conclusion, fecha, org, local) => ({
    resourceType: "DiagnosticReport", id, status: "final",
    code: { coding: [coding(codigo, display, local)], text: display },
    subject: ref(pid), effectiveDateTime: fecha, performer: [{ display: org }], conclusion,
  }),
  medication: (id, pid, texto, fecha, org) => ({
    resourceType: "MedicationStatement", id, status: "active",
    medicationCodeableConcept: { text: texto }, subject: ref(pid), effectiveDateTime: fecha,
    informationSource: { display: org },
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
  }),
};

const TIPOS = ["Observation", "DiagnosticReport", "MedicationStatement", "AllergyIntolerance", "Condition"];

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
  for (const clave of spec.sistemas) {
    const st = stores[clave];
    const pid = `${SISTEMAS[clave].prefijo}-PAC-${10000 + Math.floor(r() * 89999)}`;
    locales[clave] = pid;
    agregarPaciente(st, pid, fhir.patient(pid, spec.dni, spec.nombres, spec.apellidos, spec.sexo, spec.nacimiento));
    if (clave === spec.sistemas[0]) {
      for (const [cie, texto] of spec.condiciones) agregar(st, pid, fhir.condition(idNuevo(st, "Condition"), pid, cie, texto, SISTEMAS[clave].establecimiento));
    }
  }
  for (const [clave, sust, reac] of spec.alergias) {
    const st = stores[clave];
    agregar(st, locales[clave], fhir.allergy(idNuevo(st, "AllergyIntolerance"), locales[clave], sust, reac, SISTEMAS[clave].establecimiento));
  }
  for (const [clave, texto] of spec.medicamentos) {
    const st = stores[clave];
    agregar(st, locales[clave], fhir.medication(idNuevo(st, "MedicationStatement"), locales[clave], texto, haceDias(10 + Math.floor(r() * 110)), SISTEMAS[clave].establecimiento));
  }
  for (const [codigo, dias, clave] of spec.examenes) {
    const st = stores[clave];
    const pid = locales[clave];
    const [nombre] = CATALOGO[codigo];
    const local = clave === "clinica";
    const cod = local ? LOINC_A_LOCAL[codigo] : codigo;
    const org = SISTEMAS[clave].establecimiento;
    const fecha = haceDias(dias);
    if (RANGOS[codigo]) {
      const [bajo, alto, unidad] = RANGOS[codigo];
      const valor = Math.round((bajo + r() * (alto - bajo)) * 10) / 10;
      agregar(st, pid, fhir.observation(idNuevo(st, "Observation"), pid, cod, nombre, valor, unidad, fecha, org, local));
    } else {
      const t = TEXTOS[codigo];
      agregar(st, pid, fhir.report(idNuevo(st, "DiagnosticReport"), pid, cod, nombre, t[Math.floor(r() * t.length)], fecha, org, local));
    }
  }
}

export function construirDataset(semilla = 2026, total = 24) {
  const r = mulberry32(semilla);
  const stores = Object.fromEntries(Object.keys(SISTEMAS).map((c) => [c, nuevoStore(c)]));
  const specs = [...CASOS, ...Array.from({ length: total - CASOS.length }, (_, i) => aleatorio(i, r))];
  for (const spec of specs) cargar(stores, spec, r);
  return { stores, pacientes: specs.map((s) => ({ dni: s.dni, nombre: `${s.nombres} ${s.apellidos}`, sistemas: s.sistemas, consentimiento: s.consentimiento, titulo: s.titulo, muestra: s.muestra })) };
}

export { haceDias, TIPOS };
