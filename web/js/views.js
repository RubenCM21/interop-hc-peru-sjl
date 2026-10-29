// Vistas: devuelven HTML (todo el texto dinámico pasa por esc()).
import { SISTEMAS } from "./data.js";

export const esc = (t) => String(t ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const icon = (n, extra = "") => `<svg class="icon ${extra}" aria-hidden="true"><use href="assets/icons.svg#i-${n}"></use></svg>`;
const fecha = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
const fechaHora = (iso) => new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
const ms = (n) => `${Math.round(n)} ms`;
const chip = (clave) => `<span class="chip ${esc(clave)}">${esc(SISTEMAS[clave].corto)}</span>`;
const sexo = (s) => (s === "female" ? "Mujer" : "Hombre");

const LINKS = {
  dyer: "https://www.infobae.com/peru/2026/08/06/ministro-de-salud-luis-dyer-revela-que-archivos-del-minsa-aun-se-guardan-en-cd-estamos-en-el-ano-95/",
  sihce: "https://www.estudiorodrigo.com/publicaciones/life-sciences-producto-legal-implementacion-de-las-historias-clinicas-electronicas-en-el-peru",
  renipress: "https://www.datosabiertos.gob.pe/dataset/registro-nacional-de-entidades-prestadoras-de-servicios-de-salud-renipress",
};

export function mensajeAlerta(a) {
  return `${a.examen}: se repitió en ${a.lugarRepeticion} ${a.dias} días después de ${a.lugarAnterior} (ventana de ${a.ventana} días).`;
}

// ---------- portada ----------
export function inicio(casos) {
  return `
  <section class="wrap hero" aria-labelledby="h-hero">
    <div class="hero-copy">
      <h1 id="h-hero">El historial del paciente, en una sola vista</h1>
      <p class="lead">Conecta Minsa, EsSalud y clínicas por DNI y avisa antes de repetir un examen que ya existe.</p>
      <div class="actions">
        <a class="btn primary" href="#/visor">Abrir el visor ${icon("arrow-right")}</a>
        <a class="btn ghost" href="#/" data-scroll="como-funciona">Cómo funciona</a>
      </div>
    </div>
    <aside class="livecard" id="vista-previa" aria-label="Ejemplo de resumen unificado" aria-busy="true">${vistaPreviaCargando()}</aside>
  </section>

  <section class="wrap block reveal" aria-labelledby="h-cifras">
    <div class="stats-head"><h2 id="h-cifras">Hoy el historial no viaja con el paciente</h2></div>
    <dl class="stats">
      <div><dt>de los 7 400 establecimientos del Minsa no tiene acceso a internet</dt><dd>54<small> %</small></dd><a class="src" href="${LINKS.dyer}" rel="noopener">Ministro Dyer, ago. 2026</a></div>
      <div><dt>de las IPRESS de primer nivel tiene el SIHCE completo</dt><dd>5,5<small> %</small></dd><a class="src" href="${LINKS.sihce}" rel="noopener">Minsa, jun. 2025</a></div>
      <div><dt>establecimientos activos en el registro nacional, cada uno con su propio historial</dt><dd>26 972</dd><a class="src" href="${LINKS.renipress}" rel="noopener">RENIPRESS, sep. 2026</a></div>
      <div><dt>pacientes entrevistados repitieron exámenes y cargaron sus resultados</dt><dd>4<small> de 4</small></dd><span class="src">Entrevistas del equipo</span></div>
    </dl>
  </section>

  <section class="wrap block reveal" id="funciones" aria-labelledby="h-fun">
    <div class="split">
      <div class="intro">
        <h2 id="h-fun">Qué resuelve el prototipo</h2>
        <p>Cuatro capacidades pensadas para el momento de la consulta.</p>
      </div>
      <ul class="features">
        <li><span class="tile">${icon("git-merge")}</span><div><h3>Un historial por DNI</h3><p>Consulta los tres sistemas en paralelo y une medicamentos, alergias y exámenes, indicando de dónde viene cada dato.</p></div></li>
        <li><span class="tile">${icon("copy-simple")}</span><div><h3>Alerta de exámenes repetidos</h3><p>Detecta repeticiones entre establecimientos y avisa antes de pedir un examen que ya existe.</p></div></li>
        <li><span class="tile">${icon("shield-check")}</span><div><h3>Consentimiento y trazabilidad</h3><p>El paciente autoriza el acceso y queda registrado quién consultó su historial.</p></div></li>
        <li><span class="tile">${icon("plugs-connected")}</span><div><h3>Sigue funcionando si un sistema cae</h3><p>El visor muestra lo disponible y marca el historial como incompleto en lugar de fallar.</p></div></li>
      </ul>
    </div>
  </section>

  <section class="wrap block reveal" id="casos" aria-labelledby="h-casos">
    <h2 id="h-casos">Seis casos para probar</h2>
    <div class="rail" tabindex="0" role="region" aria-label="Casos de demostración, desplazable">
      ${casos.filter((c) => c.titulo).map((c) => `
      <article class="case">
        <span class="dni">DNI ${esc(c.dni)}</span>
        <div><h3>${esc(c.titulo)}</h3><p class="sub" style="color:var(--muted);font-size:.9rem;margin-block-start:.15rem">${esc(c.nombre)}</p></div>
        <div class="chips">${c.sistemas.map(chip).join("")}</div>
        <p>${esc(c.muestra)}</p>
        <a class="btn secondary sm" href="#/visor/${esc(c.dni)}">Abrir caso ${icon("arrow-right")}</a>
      </article>`).join("")}
    </div>
  </section>

  <section class="wrap block reveal" id="como-funciona" aria-labelledby="h-arq">
    <h2 id="h-arq">Cómo se conectan los sistemas</h2>
    <div class="arch">
      <div class="node"><h3>Visor del médico</h3><p>Pide el historial por DNI y muestra el resumen.</p></div>
      ${icon("arrow-right")}
      <div class="node core"><h3>Capa de interoperabilidad</h3><p>Consulta en paralelo, traduce códigos locales a LOINC, une por DNI y aplica el consentimiento.</p></div>
      ${icon("arrow-right")}
      <div class="node"><h3>Sistemas con API FHIR</h3>
        <div class="stack" style="margin-block-start:.7rem">
          ${Object.entries(SISTEMAS).map(([k, s]) => `<div class="sys"><span>${chip(k)} ${esc(s.establecimiento)}</span><span>RENIPRESS ${esc(s.cod)}</span></div>`).join("")}
        </div>
      </div>
    </div>
    <p class="note">Hoy la capa de interoperabilidad corre en el navegador con datos ficticios. El siguiente paso es llevarla a un backend con FastAPI y Supabase sin cambiar la interfaz.</p>
  </section>`;
}

export function vistaPreviaCargando() {
  return `<div class="sk" style="block-size:1.6rem;inline-size:60%"></div>
    <div class="sk" style="block-size:1rem;inline-size:40%;margin-block:.6rem 1rem"></div>
    <div class="sk" style="block-size:3.2rem;margin-block-end:.6rem"></div><div class="sk" style="block-size:3.2rem"></div>`;
}

export function vistaPrevia(r) {
  const alertas = r.repetidos.slice(0, 2);
  return `
    <h2>${esc(r.nombre)}</h2>
    <p class="meta"><span class="mono">DNI ${esc(r.dni)}</span>, ${r.edad} años. Resumen armado en ${ms(r.traza.total)} desde ${r.establecimientos.length} sistemas.</p>
    ${alertas.length ? `<ul>${alertas.map((a) => `<li>${icon("warning")}<span>${esc(mensajeAlerta(a))}</span></li>`).join("")}</ul>` : ""}
    <footer>
      <div class="chips">${r.establecimientos.map((e) => chip(e.clave)).join("")}</div>
      <a class="btn secondary sm" href="#/visor/${esc(r.dni)}">Abrir en el visor ${icon("arrow-right")}</a>
    </footer>`;
}

// ---------- visor ----------
export function visorBase() {
  return `
  <div class="wrap viewer">
    <div class="viewer-title">
      <div>
        <h1>Visor de historia clínica</h1>
        <p>Consulte a un paciente por DNI. Los datos de los tres sistemas se unifican en una sola vista.</p>
      </div>
    </div>
    <aside class="side" aria-label="Búsqueda y controles">
      <section class="panel" aria-labelledby="v-buscar">
        <h2 id="v-buscar">Consultar paciente</h2>
        <form id="f-dni" novalidate>
          <div class="field">
            <label for="dni">DNI del paciente</label>
            <input id="dni" name="dni" inputmode="numeric" maxlength="8" autocomplete="off" aria-describedby="dni-ayuda" placeholder="90000001">
            <p class="help" id="dni-ayuda">8 dígitos. Los DNI de demostración empiezan en 9000.</p>
          </div>
          <button class="btn primary" type="submit" style="margin-block-start:.9rem;inline-size:100%">Consultar historial</button>
        </form>
        <div id="msg" role="status" aria-live="polite"></div>
      </section>
      <section class="panel" aria-labelledby="v-casos"><h2 id="v-casos">Casos de demostración</h2><ul class="caselist" id="lista-casos"></ul></section>
      <section class="panel" aria-labelledby="v-sis">
        <h2 id="v-sis">Sistemas conectados</h2>
        <ul class="switches" id="lista-sistemas"></ul>
        <p class="help" style="margin-block-start:.6rem">Apague uno para simular una caída y vea cómo responde el visor.</p>
      </section>
    </aside>
    <div class="stack-main" id="resultado" aria-live="polite"></div>
  </div>`;
}

export function pintarCasos(casos, activo) {
  return casos.filter((c) => c.titulo).map((c) => `
    <li><button type="button" data-dni="${esc(c.dni)}" ${c.dni === activo ? 'aria-current="true"' : ""}>
      <span class="top"><span class="nm">${esc(c.nombre)}</span><span class="dni">${esc(c.dni)}</span></span>
      <span class="chips">${c.sistemas.map(chip).join("")}${c.consentimiento ? "" : `<span class="chip" style="--c:var(--danger)">Sin consentimiento</span>`}</span>
    </button></li>`).join("");
}

export function pintarSistemas(sistemas) {
  return sistemas.map((s) => `
    <li><button class="switch" type="button" role="switch" aria-checked="${s.enLinea}" data-sistema="${esc(s.clave)}" aria-label="${esc(s.nombre)}: ${s.enLinea ? "en línea" : "caído"}. Activar para cambiar">
      <span>${esc(s.nombre)}<br><small class="help">${esc(s.establecimiento)}</small></span>
      <span class="state">${icon(s.enLinea ? "check-circle" : "x-circle")}${s.enLinea ? "En línea" : "Caído"}</span>
    </button></li>`).join("");
}

export function resultadoVacio() {
  return `<div class="empty">${icon("list-checks")}<h2>Elija un caso o ingrese un DNI</h2>
    <p>El visor consulta Minsa, EsSalud y la clínica al mismo tiempo, unifica el resultado y marca los exámenes repetidos.</p></div>`;
}
export function resultadoCargando() {
  return `<div class="panel" aria-busy="true"><div class="sk" style="block-size:2rem;inline-size:45%"></div>
    <div class="sk" style="block-size:1rem;inline-size:30%;margin-block:.7rem 1.2rem"></div><div class="sk" style="block-size:4rem"></div></div>
    <div class="panel"><div class="sk" style="block-size:1.2rem;inline-size:25%;margin-block-end:1rem"></div>
    <div class="sk" style="block-size:2.6rem;margin-block-end:.5rem"></div><div class="sk" style="block-size:2.6rem;margin-block-end:.5rem"></div><div class="sk" style="block-size:2.6rem"></div></div>`;
}
export function resultadoError(e, dni) {
  if (e.codigo === "sin_consentimiento") {
    return `<div class="alert err">${icon("lock-key")}<div><h3>Acceso bloqueado</h3>
      <p>${esc(e.message)} Esta consulta quedó registrada como denegada.</p>
      <p style="margin-block-start:.8rem"><button class="btn primary sm" type="button" data-accion="autorizar" data-dni="${esc(dni)}">${icon("lock-key-open")} Simular autorización del paciente</button></p></div></div>`;
  }
  return `<div class="alert err">${icon("warning")}<div><h3>No se pudo consultar</h3><p>${esc(e.message)}</p></div></div>`;
}

export function resultadoResumen(r, accesos, catalogo) {
  const dup = new Set(r.repetidos.flatMap((a) => [`${a.codigo}|${a.fechaAnterior}`, `${a.codigo}|${a.fechaRepeticion}`]));
  const caidos = r.establecimientos.filter((e) => e.estado === "no_disponible");
  const traza = r.traza;
  return `
  <article class="patient" aria-labelledby="pac-nombre">
    <section class="panel">
      <div class="head">
        <div>
          <h2 id="pac-nombre" tabindex="-1">${esc(r.nombre)}</h2>
          <p class="sub"><span class="mono">DNI ${esc(r.dni)}</span>, ${r.edad} años, ${sexo(r.sexo)}</p>
        </div>
        <span class="consent">${icon("shield-check")} Acceso autorizado <button class="btn secondary" type="button" data-accion="revocar" data-dni="${esc(r.dni)}">Revocar</button></span>
      </div>
      <div class="sources" style="margin-block-start:1rem">
        ${r.establecimientos.map((e) => e.estado === "no_disponible"
          ? `<span class="src caido">${chip(e.clave)} ${icon("cloud-slash")} No disponible</span>`
          : `<span class="src">${chip(e.clave)} <code>${esc(e.idLocal)}</code></span>`).join("")}
      </div>
    </section>

    ${caidos.length ? `<div class="alert err">${icon("cloud-slash")}<div><h3>Historial incompleto</h3>
      <p>No se pudo consultar ${caidos.map((c) => esc(SISTEMAS[c.clave].nombre)).join(" ni ")}. Sus datos no aparecen en este resumen.</p></div></div>` : ""}

    ${r.repetidos.length
      ? `<div class="alert">${icon("warning")}<div><h3>${r.repetidos.length} ${r.repetidos.length === 1 ? "examen repetido" : "exámenes repetidos"} entre establecimientos</h3><ul>${r.repetidos.map((a) => `<li>${esc(mensajeAlerta(a))}</li>`).join("")}</ul></div></div>`
      : `<div class="alert ok">${icon("check-circle")}<div><h3>Sin exámenes repetidos recientes</h3><p>No se detectaron duplicados entre establecimientos.</p></div></div>`}

    <section class="panel order" aria-labelledby="pedido-t">
      <h2 id="pedido-t">Pedir un examen</h2>
      <p class="help" style="margin-block-end:.8rem">Antes de ordenar, el visor revisa si ya existe uno reciente en cualquier establecimiento.</p>
      <div class="row">
        <div class="field"><label for="examen">Examen</label>
          <select id="examen">${catalogo.map((c) => `<option value="${esc(c.codigo)}">${esc(c.nombre)}</option>`).join("")}</select></div>
        <button class="btn primary" type="button" data-accion="pedir" data-dni="${esc(r.dni)}">Evaluar pedido</button>
      </div>
      <div class="result" id="pedido-res" role="status" aria-live="polite"></div>
    </section>

    <section class="panel">
      <div class="table-wrap" tabindex="0" role="region" aria-labelledby="tabla-cap">
        <table>
          <caption id="tabla-cap">Exámenes (${r.examenes.length})</caption>
          <thead><tr><th scope="col">Fecha</th><th scope="col">Examen</th><th scope="col">Resultado</th><th scope="col">Origen</th></tr></thead>
          <tbody>
            ${r.examenes.map((e) => `<tr class="${dup.has(`${e.codigo}|${e.fecha}`) ? "dup" : ""}">
              <th scope="row">${fecha(e.fecha)}</th>
              <td data-label="Examen">${esc(e.nombre)}
                ${e.codigo ? `<span class="loinc">LOINC ${esc(e.codigo)}${e.codigoOriginal ? ` (código local ${esc(e.codigoOriginal)} traducido)` : ""}</span>` : ""}
                ${dup.has(`${e.codigo}|${e.fecha}`) ? `<span class="badge-dup">${icon("copy-simple")} Repetido</span>` : ""}</td>
              <td data-label="Resultado" class="num">${esc(e.resultado)}</td>
              <td data-label="Origen">${chip(e.sistema)}</td></tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>

    <div class="cols-2">
      <section class="panel"><h2>Medicamentos</h2>${lista(r.medicamentos, (m) => `<li>${esc(m.nombre)}<small>${m.fuentes.map(esc).join(", ")}</small></li>`)}</section>
      <section class="panel"><h2>Alergias</h2>${lista(r.alergias, (a) => `<li><span class="dang">${esc(a.sustancia)}</span>${esc(a.reaccion)}<small>Registrada en: ${a.fuentes.map(esc).join(", ")}</small></li>`)}</section>
    </div>
    <section class="panel"><h2>Condiciones</h2>${lista(r.condiciones, (c) => `<li>${esc(c.nombre)}<small>CIE-10 ${esc(c.codigo)}. ${c.fuentes.map(esc).join(", ")}</small></li>`)}</section>

    <section class="panel trace">
      <details>
        <summary>${icon("arrows-clockwise")} Cómo se armó este resumen</summary>
        <table><thead><tr><th scope="col">Sistema</th><th scope="col">Peticiones</th><th scope="col">Tiempo</th><th scope="col">Estado</th></tr></thead><tbody>
          ${traza.sistemas.map((s) => `<tr><td>${chip(s.clave)}</td><td class="num">${s.peticiones}</td><td class="ms">${ms(s.ms)}</td>
            <td class="${s.estado === "ok" ? "est-ok" : s.estado === "no_disponible" ? "est-no" : "est-sr"}">${s.estado === "ok" ? "Respondió" : s.estado === "no_disponible" ? "No disponible" : "Sin registro"}</td></tr>`).join("")}
        </tbody></table>
        <p>${traza.examenes} exámenes unificados${traza.traducidos ? `, ${traza.traducidos} con código local traducido a LOINC` : ""}. Las consultas corren en paralelo: el tiempo total fue ${ms(traza.total)}.</p>
      </details>
    </section>

    <section class="panel log" id="log">${logHtml(accesos)}</section>
  </article>`;
}

export function logHtml(accesos) {
  return `<h2>Quién consultó este historial</h2>` + lista(accesos.slice(0, 6), (a) => `<li><span>${esc(a.quien)}<small>${esc(a.motivo)}</small></span><span class="${a.resultado === "denegado" ? "den" : ""}">${esc(a.resultado)}<small>${esc(fechaHora(a.cuando))}</small></span></li>`, "Sin accesos registrados todavía.");
}

function lista(items, fila, vacio = "Sin registros.") {
  return items.length ? `<ul class="list">${items.map(fila).join("")}</ul>` : `<p class="help">${vacio}</p>`;
}

export function resultadoPedido(p) {
  if (p.duplicado) {
    return `<div class="alert">${icon("warning")}<div><h3>Posible duplicado</h3>
      <p>${esc(p.examen)} se hizo hace ${p.dias} días en ${esc(p.previo.establecimiento)} (resultado: ${esc(p.previo.resultado)}). Ventana de ${p.ventana} días.</p></div></div>`;
  }
  const extra = p.previo ? `El último fue hace ${p.dias} días en ${esc(p.previo.establecimiento)}, fuera de la ventana de ${p.ventana} días.` : "No hay registros previos.";
  return `<div class="alert ok">${icon("check-circle")}<div><h3>Se puede pedir</h3><p>${esc(p.examen)}. ${extra}</p></div></div>`;
}
