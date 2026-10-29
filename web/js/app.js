// Enrutador por hash, tema y eventos. La lógica de datos vive en gateway.js.
import { api } from "./gateway.js";
import * as v from "./views.js";

const $ = (id) => document.getElementById(id);
const main = $("principal");
const sinMovimiento = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

let casos = [], sistemas = [], catalogo = [];
let activo = null;
let turno = 0;

// ---------- tema ----------
const temaActual = () => document.documentElement.dataset.theme ?? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
function pintarBotonTema() {
  const oscuro = temaActual() === "dark";
  $("tema").innerHTML = v.icon(oscuro ? "sun" : "moon");
  $("tema").setAttribute("aria-label", oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro");
}
$("tema").addEventListener("click", () => {
  const siguiente = temaActual() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = siguiente;
  try { localStorage.setItem("tema", siguiente); } catch { /* ignorar */ }
  pintarBotonTema();
});

// ---------- rutas ----------
function rutaActual() {
  const [seg, arg] = location.hash.replace(/^#\/?/, "").split("/");
  return { nombre: seg === "visor" ? "visor" : "inicio", dni: arg };
}

function pintarRuta(r) {
  document.querySelectorAll("[data-nav]").forEach((a) => {
    if (a.dataset.nav === r.nombre) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  if (r.nombre === "inicio") {
    document.title = "Historia clínica unificada | interop-hc-peru";
    main.innerHTML = v.inicio(casos);
    activarReveal();
    hidratarInicio();
  } else {
    document.title = "Visor | interop-hc-peru";
    main.innerHTML = v.visorBase();
    pintarLaterales();
    if (r.dni) consultar(r.dni);
    else $("resultado").innerHTML = v.resultadoVacio();
  }
}

async function render(primera = false) {
  const r = rutaActual();
  const cambiar = () => pintarRuta(r);
  if (!primera && document.startViewTransition && !sinMovimiento()) {
    const t = document.startViewTransition(cambiar);
    await t.finished.catch(() => {});
  } else {
    cambiar();
  }
  if (!primera) {
    window.scrollTo({ top: 0, behavior: "instant" });
    main.focus({ preventScroll: true });
  }
}

function activarReveal() {
  const items = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) return items.forEach((e) => e.classList.add("in"));
  const io = new IntersectionObserver((entradas) => {
    for (const e of entradas) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
  items.forEach((e) => io.observe(e));
}

async function hidratarInicio() {
  const el = $("vista-previa");
  try {
    const r = await api.vistaPrevia("90000001");
    if (!el.isConnected) return;
    el.innerHTML = v.vistaPrevia(r);
  } catch {
    if (el.isConnected) el.innerHTML = `<p class="help">No se pudo cargar el ejemplo.</p>`;
  }
  el.setAttribute("aria-busy", "false");
}

// ---------- visor ----------
function pintarLaterales() {
  const lc = $("lista-casos"), ls = $("lista-sistemas");
  if (lc) lc.innerHTML = v.pintarCasos(casos, activo);
  if (ls) ls.innerHTML = v.pintarSistemas(sistemas);
}

async function refrescarCasos() {
  casos = (await api.casos()).map((c) => ({ ...c, titulo: c.titulo }));
  pintarLaterales();
}

function mensaje(html, info = false) {
  const m = $("msg");
  if (m) m.innerHTML = html ? `<div class="msg ${info ? "info" : ""}">${html}</div>` : "";
}

async function consultar(dni) {
  const mio = ++turno;
  activo = dni;
  $("dni") && ($("dni").value = dni);
  mensaje("");
  pintarLaterales();
  const cont = $("resultado");
  cont.innerHTML = v.resultadoCargando();
  try {
    const r = await api.resumen(dni);
    if (mio !== turno) return;
    const accesos = await api.accesos(dni);
    cont.innerHTML = v.resultadoResumen(r, accesos, catalogo);
  } catch (e) {
    if (mio !== turno) return;
    cont.innerHTML = v.resultadoError(e, dni);
  }
  await refrescarCasos();
}

$("principal").addEventListener("submit", (ev) => {
  if (ev.target.id !== "f-dni") return;
  ev.preventDefault();
  const dni = $("dni").value.trim();
  if (!/^\d{8}$/.test(dni)) {
    $("dni").setAttribute("aria-invalid", "true");
    mensaje(`${v.esc("Ingrese un DNI de 8 dígitos, por ejemplo 90000001.")}`);
    $("dni").focus();
    return;
  }
  $("dni").removeAttribute("aria-invalid");
  const destino = `#/visor/${dni}`;
  if (location.hash === destino) consultar(dni);
  else location.hash = destino;
});

document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-dni],[data-accion],[data-sistema],[data-scroll]");
  if (!el) return;

  if (el.dataset.scroll) {
    ev.preventDefault();
    $(el.dataset.scroll)?.scrollIntoView({ behavior: sinMovimiento() ? "auto" : "smooth", block: "start" });
    return;
  }
  if (el.dataset.sistema) {
    const enLinea = el.getAttribute("aria-checked") !== "true";
    await api.fijarEnLinea(el.dataset.sistema, enLinea);
    sistemas = await api.sistemas();
    pintarLaterales();
    if (activo) consultar(activo);
    return;
  }
  const accion = el.dataset.accion;
  const dni = el.dataset.dni;
  if (accion === "autorizar") { await api.consentimiento(dni, true); await consultar(dni); }
  else if (accion === "revocar") {
    await api.consentimiento(dni, false);
    $("resultado").innerHTML = v.resultadoError({ codigo: "sin_consentimiento", message: "El paciente revocó su consentimiento." }, dni);
    await refrescarCasos();
  } else if (accion === "pedir") {
    const codigo = $("examen").value;
    const res = $("pedido-res");
    res.innerHTML = `<div class="sk" style="block-size:3.5rem"></div>`;
    try {
      res.innerHTML = v.resultadoPedido(await api.pedirExamen(dni, codigo));
      $("log").innerHTML = v.logHtml(await api.accesos(dni));
    } catch (e) {
      res.innerHTML = v.resultadoError(e, dni);
    }
  } else if (dni) {
    const destino = `#/visor/${dni}`;
    if (location.hash === destino) consultar(dni);
    else location.hash = destino;
  }
});

addEventListener("hashchange", () => render());

(async function iniciar() {
  [casos, sistemas, catalogo] = await Promise.all([api.casos(), api.sistemas(), api.catalogo()]);
  pintarBotonTema();
  await render(true);
})();
