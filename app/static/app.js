const $ = (id) => document.getElementById(id);
const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fecha = (iso) => new Date(iso + "T00:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
const chip = (clave, texto) => `<span class="chip ${esc(clave)}">${esc(texto)}</span>`;
const SIS = { minsa: "Minsa", essalud: "EsSalud", clinica: "Clínica" };

let dniActual = null;

async function api(ruta, opciones) {
  const r = await fetch(ruta, opciones);
  let cuerpo = null;
  try { cuerpo = await r.json(); } catch { /* sin cuerpo */ }
  if (!r.ok) {
    const d = cuerpo && cuerpo.detail;
    const e = new Error(typeof d === "string" ? d : (d && d.mensaje) || "Error inesperado");
    e.estado = r.status; e.codigo = d && d.codigo;
    throw e;
  }
  return cuerpo;
}

function mensaje(texto, info = false) {
  const m = $("msg");
  m.hidden = !texto;
  m.textContent = texto || "";
  m.className = "msg" + (info ? " info" : "");
}

async function cargarSistemas() {
  const { sistemas } = await api("/api/salud");
  $("sistemas").innerHTML = sistemas.map((s) =>
    `<button class="sis ${s.en_linea ? "" : "off"}" data-clave="${esc(s.clave)}" data-linea="${s.en_linea}"
       title="Clic para simular ${s.en_linea ? "la caída" : "la recuperación"} de este sistema">
       <span class="punto"></span>${esc(s.nombre)}</button>`).join("");
}

async function cargarDemo() {
  const lista = await api("/api/demo/pacientes");
  $("demo").innerHTML = `<option value="">Elegir…</option>` + lista.map((p) =>
    `<option value="${esc(p.dni)}">${esc(p.dni)} · ${esc(p.nombre)} (${p.sistemas.map((s) => SIS[s]).join(", ")})</option>`).join("");
}

async function cargarCatalogo() {
  const cat = await api("/api/examenes/catalogo");
  $("examen").innerHTML = cat.map((e) => `<option value="${esc(e.codigo)}">${esc(e.nombre)}</option>`).join("");
}

function pintarPaciente(r) {
  $("paciente").innerHTML = `
    <p class="pac-nombre">${esc(r.nombre)}</p>
    <p class="pac-meta">DNI ${esc(r.dni)} · ${r.edad} años · ${r.sexo === "female" ? "Mujer" : "Hombre"}</p>
    <div class="consent" id="consent-estado">Acceso autorizado por el paciente
      <button class="btn pequeno" id="btn-revocar" type="button">Revocar</button></div>`;
  $("btn-revocar").onclick = () => fijarConsentimiento(false);

  $("estabs").innerHTML = `<h3>Establecimientos que aportan datos</h3>` + r.establecimientos.map((e) => `
    <div class="estab"><div>${chip(e.sistema, SIS[e.sistema])}
      <small>${esc(e.establecimiento)}</small></div>
      <div style="text-align:right"><small>ID local</small><code>${esc(e.id_local)}</code>
      ${e.estado === "ok" ? "" : `<div class="estado-off">No disponible</div>`}</div></div>`).join("");
}

function pintarAlertas(r) {
  const caidos = r.establecimientos.filter((e) => e.estado !== "ok");
  let html = "";
  if (caidos.length) {
    html += `<div class="alerta err"><h3>Historial incompleto</h3>
      <p style="margin:0;font-size:14px">No se pudo consultar: ${caidos.map((c) => esc(c.nombre_sistema)).join(", ")}.
      Los datos de esos sistemas no aparecen en este resumen.</p></div>`;
  }
  if (r.repetidos.length) {
    html += `<div class="alerta"><h3>${r.repetidos.length} examen(es) repetido(s) entre establecimientos</h3><ul>` +
      r.repetidos.map((a) => `<li>${esc(a.mensaje)}</li>`).join("") + `</ul></div>`;
  } else {
    html += `<div class="alerta ok"><h3>Sin exámenes repetidos recientes</h3>
      <p style="margin:0;font-size:14px">No se detectaron exámenes duplicados entre establecimientos.</p></div>`;
  }
  $("alertas").innerHTML = html;
}

function pintarExamenes(r) {
  const duplicados = new Set(r.repetidos.flatMap((a) => [`${a.codigo}|${a.fecha_anterior}`, `${a.codigo}|${a.fecha_repeticion}`]));
  $("examenes").innerHTML = `<h2>Exámenes (${r.examenes.length})</h2>` + (r.examenes.length ? `
    <table><thead><tr><th>Fecha</th><th>Examen</th><th>Resultado</th><th>Establecimiento</th></tr></thead><tbody>` +
    r.examenes.map((e) => `<tr class="${duplicados.has(`${e.codigo}|${e.fecha}`) ? "dup" : ""}">
      <td>${fecha(e.fecha)}</td><td>${esc(e.nombre)}${e.codigo ? `<br><small class="vacío">LOINC ${esc(e.codigo)}</small>` : ""}</td>
      <td>${esc(e.resultado)}</td><td>${chip(e.sistema, SIS[e.sistema])}</td></tr>`).join("") +
    `</tbody></table>` : `<p class="vacío">Sin exámenes registrados.</p>`);
}

function lista(id, titulo, items, fila) {
  $(id).innerHTML = `<h2>${titulo}</h2>` + (items.length
    ? `<ul class="lista">${items.map(fila).join("")}</ul>` : `<p class="vacío">Sin registros.</p>`);
}

function pintarResto(r) {
  lista("meds", "Medicamentos", r.medicamentos, (m) => `<li>${esc(m.nombre)}<small>${m.fuentes.map(esc).join(" · ")}</small></li>`);
  lista("alergias", "Alergias", r.alergias, (a) => `<li><strong>${esc(a.sustancia)}</strong> · ${esc(a.reaccion)}<small>Registrada en: ${a.fuentes.map(esc).join(" · ")}</small></li>`);
  lista("conds", "Condiciones", r.condiciones, (c) => `<li>${esc(c.nombre)} <small>CIE-10 ${esc(c.codigo)} · ${c.fuentes.map(esc).join(" · ")}</small></li>`);
}

async function pintarAccesos(dni) {
  const a = await api(`/api/pacientes/${dni}/accesos`);
  $("accesos-card").innerHTML = `<h3>Quién consultó este historial</h3>` + (a.length
    ? `<ul class="lista acc">${a.slice(0, 8).map((x) => `<li><span>${esc(x.quien)}<small>${esc(x.motivo)}</small></span>
        <span class="${x.resultado === "denegado" ? "den" : ""}">${esc(x.resultado)}<small>${esc(x.cuando.slice(11))}</small></span></li>`).join("")}</ul>`
    : `<p class="vacío">Sin accesos aún.</p>`);
}

async function consultar(dni) {
  mensaje("");
  $("pedido-res").innerHTML = "";
  try {
    const r = await api(`/api/pacientes/${dni}/resumen`);
    dniActual = dni;
    $("resultado").hidden = false;
    pintarPaciente(r); pintarAlertas(r); pintarExamenes(r); pintarResto(r);
    await pintarAccesos(dni);
  } catch (e) {
    $("resultado").hidden = true;
    if (e.codigo === "sin_consentimiento") {
      dniActual = dni;
      mensaje("");
      $("msg").hidden = false;
      $("msg").innerHTML = `${esc(e.message)} <button class="btn pequeno" id="btn-autorizar" type="button">Simular autorización del paciente</button>`;
      $("btn-autorizar").onclick = () => fijarConsentimiento(true);
    } else {
      mensaje(e.message);
    }
  }
}

async function fijarConsentimiento(otorgado) {
  await api(`/api/pacientes/${dniActual}/consentimiento`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ otorgado }),
  });
  if (otorgado) { await consultar(dniActual); await cargarDemo(); return; }
  $("resultado").hidden = true;
  mensaje("Consentimiento revocado: el historial ya no es accesible.", true);
  await cargarDemo();
}

$("form-buscar").addEventListener("submit", (ev) => {
  ev.preventDefault();
  const dni = $("dni").value.trim();
  consultar(dni);
});
$("demo").addEventListener("change", (ev) => { if (ev.target.value) { $("dni").value = ev.target.value; consultar(ev.target.value); } });

$("sistemas").addEventListener("click", async (ev) => {
  const b = ev.target.closest(".sis");
  if (!b) return;
  await api(`/api/demo/sistemas/${b.dataset.clave}/estado`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ en_linea: b.dataset.linea !== "true" }),
  });
  await cargarSistemas();
  if (dniActual && !$("resultado").hidden) consultar(dniActual);
});

$("btn-pedido").addEventListener("click", async () => {
  const codigo = $("examen").value;
  try {
    const r = await api(`/api/pacientes/${dniActual}/pedido-examen`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ codigo }),
    });
    $("pedido-res").innerHTML = `<div class="alerta ${r.duplicado ? "" : "ok"}" style="margin-top:12px">
      <h3>${r.duplicado ? "Posible duplicado" : "Sin duplicado reciente"}</h3>
      <p style="margin:0;font-size:14px">${esc(r.mensaje)}</p></div>`;
    await pintarAccesos(dniActual);
  } catch (e) {
    $("pedido-res").innerHTML = `<p class="msg">${esc(e.message)}</p>`;
  }
});

Promise.all([cargarSistemas(), cargarDemo(), cargarCatalogo()]);
