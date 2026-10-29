// Capa de interoperabilidad. Corre en el navegador y habla con los tres sistemas simulados
// mediante peticiones tipo FHIR (con latencia y caídas simuladas). Para pasar a un backend real
// basta con reemplazar el objeto `api` del final por llamadas fetch al servidor.
import { CATALOGO, CLINICA_LOCAL, DNI_SYSTEM, LOCAL_A_LOINC, LOINC, SISTEMAS, TIPOS, construirDataset, hoyISO } from "./data.js";

const { stores, pacientes: PACIENTES } = construirDataset();

const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const entre = ([a, b]) => a + Math.random() * (b - a);
const ahora = () => performance.now();

class ErrorHttp extends Error {
  constructor(estado, mensaje) {
    super(mensaje);
    this.estado = estado;
  }
}

// ---------- API FHIR simulada de cada sistema ----------
async function fhir(clave, tipo, params) {
  const st = stores[clave];
  await espera(entre(SISTEMAS[clave].latencia));
  if (!st.enLinea) throw new ErrorHttp(503, `${SISTEMAS[clave].nombre} no está disponible`);
  let resultado = [];
  if (tipo === "Patient") {
    const [sistema, valor] = params.identifier.includes("|") ? params.identifier.split("|") : [DNI_SYSTEM, params.identifier];
    resultado = [...st.pacientes.values()].filter((p) => p.identifier.some((i) => i.value === valor && i.system === sistema));
  } else {
    resultado = st.recursos.get(params.patient)?.[tipo] ?? [];
  }
  return { resourceType: "Bundle", type: "searchset", total: resultado.length, entry: resultado.map((resource) => ({ resource })) };
}

// ---------- normalización ----------
export function codigoLoinc(code) {
  for (const c of code.coding ?? []) {
    if (c.system === LOINC) return c.code;
    if (c.system === CLINICA_LOCAL && LOCAL_A_LOINC[c.code]) return LOCAL_A_LOINC[c.code];
  }
  return null;
}
const edad = (nac) => {
  const n = new Date(nac), h = new Date(hoyISO());
  return h.getFullYear() - n.getFullYear() - (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate()) ? 1 : 0);
};
const dias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

function aExamen(r, clave) {
  const original = r.code.coding?.[0]?.system === CLINICA_LOCAL ? r.code.coding[0].code : null;
  const codigo = codigoLoinc(r.code);
  return {
    codigo, codigoOriginal: original, nombre: codigo && CATALOGO[codigo] ? CATALOGO[codigo][0] : r.code.text ?? "Examen",
    fecha: r.effectiveDateTime.slice(0, 10),
    resultado: r.resourceType === "Observation" ? `${r.valueQuantity.value} ${r.valueQuantity.unit}` : r.conclusion ?? "",
    sistema: clave, establecimiento: SISTEMAS[clave].establecimiento, idLocal: r.id,
  };
}

// ---------- alertas ----------
export function examenesRepetidos(examenes) {
  const porCodigo = new Map();
  for (const e of examenes) if (e.codigo && CATALOGO[e.codigo]) (porCodigo.get(e.codigo) ?? porCodigo.set(e.codigo, []).get(e.codigo)).push(e);
  const alertas = [];
  for (const [codigo, lista] of porCodigo) {
    const [nombre, ventana] = CATALOGO[codigo];
    lista.sort((a, b) => a.fecha.localeCompare(b.fecha));
    for (let i = 1; i < lista.length; i++) {
      const ant = lista[i - 1], pos = lista[i];
      if (ant.sistema === pos.sistema) continue;
      const d = dias(ant.fecha, pos.fecha);
      if (d <= ventana) {
        alertas.push({
          codigo, examen: nombre, fechaAnterior: ant.fecha, lugarAnterior: ant.establecimiento, sistemaAnterior: ant.sistema,
          fechaRepeticion: pos.fecha, lugarRepeticion: pos.establecimiento, sistemaRepeticion: pos.sistema, dias: d, ventana,
        });
      }
    }
  }
  return alertas.sort((a, b) => b.fechaRepeticion.localeCompare(a.fechaRepeticion));
}

export function evaluarPedido(examenes, codigo) {
  const [nombre, ventana] = CATALOGO[codigo];
  const previos = examenes.filter((e) => e.codigo === codigo).sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (!previos.length) return { duplicado: false, examen: nombre, ventana, previo: null, dias: null };
  const ultimo = previos[0];
  const d = dias(ultimo.fecha, hoyISO());
  return { duplicado: d <= ventana, examen: nombre, ventana, previo: ultimo, dias: d };
}

// ---------- consentimiento y accesos (persisten en el navegador) ----------
const CLAVE = "interop-hc-peru:pmv1";
const estadoInicial = () => ({ consentimiento: Object.fromEntries(PACIENTES.map((p) => [p.dni, p.consentimiento])), accesos: {} });
let estado = estadoInicial();
try {
  const guardado = JSON.parse(localStorage.getItem(CLAVE) ?? "null");
  if (guardado?.consentimiento) estado = { ...estado, ...guardado, consentimiento: { ...estado.consentimiento, ...guardado.consentimiento } };
} catch { /* sin almacenamiento disponible */ }
const guardar = () => { try { localStorage.setItem(CLAVE, JSON.stringify(estado)); } catch { /* ignorar */ } };
const registrar = (dni, quien, resultado, motivo) => {
  (estado.accesos[dni] ??= []).unshift({ cuando: new Date().toISOString(), quien, resultado, motivo });
  estado.accesos[dni] = estado.accesos[dni].slice(0, 30);
  guardar();
};

export class ErrorApi extends Error {
  constructor(codigo, mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }
}

// ---------- gateway ----------
async function consultarSistema(clave, dni) {
  const t0 = ahora();
  const traza = { clave, peticiones: 0, ms: 0, estado: "ok", error: null };
  try {
    const patient = await fhir(clave, "Patient", { identifier: `${DNI_SYSTEM}|${dni}` });
    traza.peticiones = 1;
    if (!patient.entry.length) return { clave, datos: null, traza: { ...traza, ms: ahora() - t0, estado: "sin_registro" } };
    const paciente = patient.entry[0].resource;
    const bundles = await Promise.all(TIPOS.map((t) => fhir(clave, t, { patient: paciente.id })));
    traza.peticiones += TIPOS.length;
    const recursos = Object.fromEntries(TIPOS.map((t, i) => [t, bundles[i].entry.map((e) => e.resource)]));
    return { clave, datos: { paciente, recursos }, traza: { ...traza, ms: ahora() - t0 } };
  } catch (e) {
    return { clave, datos: null, traza: { ...traza, ms: ahora() - t0, estado: "no_disponible", error: e.message } };
  }
}

async function resumen(dni) {
  if (!/^\d{8}$/.test(dni)) throw new ErrorApi("dni_invalido", "El DNI debe tener 8 dígitos.");
  if (!(dni in estado.consentimiento)) throw new ErrorApi("no_encontrado", "No se encontró un paciente con ese DNI en los sistemas conectados.");
  return { dni };
}

async function consultarHistorial(dni, medico = "Dra. de demostración", motivo = "consulta de historial", dejarRegistro = true) {
  await resumen(dni);
  if (!estado.consentimiento[dni]) {
    if (dejarRegistro) registrar(dni, medico, "denegado", motivo);
    throw new ErrorApi("sin_consentimiento", "El paciente no ha autorizado el acceso a su historial.");
  }
  const t0 = ahora();
  const resultados = await Promise.all(Object.keys(SISTEMAS).map((c) => consultarSistema(c, dni)));
  const encontrados = resultados.filter((r) => r.datos);
  if (!encontrados.length) {
    const caidos = resultados.filter((r) => r.traza.estado === "no_disponible").map((r) => SISTEMAS[r.clave].nombre);
    throw new ErrorApi("no_encontrado", "No se encontró un paciente con ese DNI." + (caidos.length ? ` Sistemas no disponibles: ${caidos.join(", ")}.` : ""));
  }
  const base = encontrados[0].datos.paciente;
  const examenes = [], meds = new Map(), alergias = new Map(), condiciones = new Map();
  let traducidos = 0;
  for (const { clave, datos } of encontrados) {
    const est = SISTEMAS[clave].establecimiento;
    const r = datos.recursos;
    for (const x of [...r.Observation, ...r.DiagnosticReport]) {
      const e = aExamen(x, clave);
      if (e.codigoOriginal) traducidos++;
      examenes.push(e);
    }
    for (const m of r.MedicationStatement) {
      const t = m.medicationCodeableConcept.text;
      (meds.get(t.toLowerCase()) ?? meds.set(t.toLowerCase(), { nombre: t, fuentes: [] }).get(t.toLowerCase())).fuentes.push(est);
    }
    for (const a of r.AllergyIntolerance) {
      const k = a.code.text.toLowerCase();
      (alergias.get(k) ?? alergias.set(k, { sustancia: a.code.text, reaccion: a.reaction[0].description, fuentes: [] }).get(k)).fuentes.push(est);
    }
    for (const c of r.Condition) {
      const k = c.code.coding[0].code;
      (condiciones.get(k) ?? condiciones.set(k, { codigo: k, nombre: c.code.text, fuentes: [] }).get(k)).fuentes.push(est);
    }
  }
  examenes.sort((a, b) => b.fecha.localeCompare(a.fecha));
  if (dejarRegistro) registrar(dni, medico, "permitido", motivo);
  return {
    dni, nombre: `${base.name[0].given.join(" ")} ${base.name[0].family}`, sexo: base.gender, edad: edad(base.birthDate),
    establecimientos: resultados.filter((r) => r.datos || r.traza.estado === "no_disponible").map((r) => ({
      clave: r.clave, idLocal: r.datos?.paciente.id ?? null, estado: r.traza.estado,
    })),
    condiciones: [...condiciones.values()], alergias: [...alergias.values()], medicamentos: [...meds.values()],
    examenes, repetidos: examenesRepetidos(examenes),
    traza: { total: ahora() - t0, sistemas: resultados.map((r) => r.traza), examenes: examenes.length, traducidos },
  };
}

// ---------- API pública del frontend ----------
export const api = {
  modo: "local",
  sistemas: async () => Object.entries(SISTEMAS).map(([clave, s]) => ({ clave, ...s, enLinea: stores[clave].enLinea })),
  fijarEnLinea: async (clave, enLinea) => { stores[clave].enLinea = enLinea; },
  casos: async () => PACIENTES.map((p) => ({ ...p, consentimiento: estado.consentimiento[p.dni] })),
  catalogo: async () => Object.entries(CATALOGO).map(([codigo, [nombre, ventana, tipo]]) => ({ codigo, nombre, ventana, tipo })),
  resumen: (dni) => consultarHistorial(dni),
  vistaPrevia: (dni) => consultarHistorial(dni, "Vista previa", "vista previa", false),
  consentimiento: async (dni, otorgado) => {
    await resumen(dni);
    estado.consentimiento[dni] = otorgado;
    registrar(dni, "Paciente (simulado)", "consentimiento", otorgado ? "otorgado" : "revocado");
  },
  accesos: async (dni) => estado.accesos[dni] ?? [],
  pedirExamen: async (dni, codigo) => {
    const r = await consultarHistorial(dni, "Dra. de demostración", `pedido de ${CATALOGO[codigo][0]}`);
    return evaluarPedido(r.examenes, codigo);
  },
  reiniciar: async () => { estado = estadoInicial(); guardar(); },
};

export { SISTEMAS };
