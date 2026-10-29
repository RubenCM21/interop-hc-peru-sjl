"use client";

import { useState, type RefObject } from "react";
import {
  ArrowsClockwise, CheckCircle, CloudSlash, LockKey, LockKeyOpen, ShieldCheck, Warning,
} from "@phosphor-icons/react";
import { api, SISTEMAS, type Fuente, type Pedido, type Resumen, type Terminologia } from "@/lib/gateway";
import { Chip, btn, fecha, fechaHora, ms, panel } from "../ui";
import { mensajeAlerta, sexo } from "../textos";
import { HistorialAtenciones, ExamenesFiltrados, DirectorioSJL } from "./historial";

const aviso = {
  warn: "border-warn-line bg-warn-bg text-warn",
  err: "border-danger-line bg-danger-bg text-danger",
  ok: "border-ok-line bg-ok-bg text-ok",
};

function Aviso({ tipo, icono, titulo, children }: { tipo: keyof typeof aviso; icono: React.ReactNode; titulo: string; children?: React.ReactNode }) {
  return (
    <div className={`flex gap-3.5 rounded-card border p-4 sm:p-5 ${aviso[tipo]}`} role={tipo === "err" ? "alert" : undefined}>
      <span className="mt-0.5 shrink-0">{icono}</span>
      <div className="min-w-0">
        <h3 className="text-base font-semibold">{titulo}</h3>
        <div className="mt-1 text-[0.95rem] text-ink [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">{children}</div>
      </div>
    </div>
  );
}

export function Cargando() {
  return (
    <>
      <div className={panel} aria-busy="true"><div className="sk h-8 w-[45%]" /><div className="sk mb-5 mt-3 h-4 w-[30%]" /><div className="sk h-16" /></div>
      <div className={panel}><div className="sk mb-4 h-5 w-1/4" /><div className="sk mb-2 h-10" /><div className="sk mb-2 h-10" /><div className="sk h-10" /></div>
    </>
  );
}

export function ResultadoError({ e, onAutorizar }: { e: { codigo: string; message: string }; onAutorizar: () => void }) {
  if (e.codigo === "sin_consentimiento") {
    return (
      <Aviso tipo="err" icono={<LockKey size={28} aria-hidden />} titulo="Acceso bloqueado">
        <p>{e.message} Esta consulta quedó registrada como denegada.</p>
        <button type="button" onClick={onAutorizar} className={`${btn.primary} ${btn.sm} mt-4`}>
          <LockKeyOpen size={18} aria-hidden /> Simular autorización del paciente
        </button>
      </Aviso>
    );
  }
  return <Aviso tipo="err" icono={<Warning size={28} aria-hidden />} titulo="No se pudo consultar"><p>{e.message}</p></Aviso>;
}

function Lista<T>({ items, vacio = "Sin registros.", fila }: { items: T[]; vacio?: string; fila: (x: T) => React.ReactNode }) {
  return items.length
    ? <ul className="mt-3 divide-y divide-line">{items.map((x, i) => <li key={i} className="py-2.5 first:pt-0 last:pb-0">{fila(x)}</li>)}</ul>
    : <p className="mt-3 text-sm text-muted">{vacio}</p>;
}
function Origenes({ fuentes, prefijo }: { fuentes: Fuente[]; prefijo?: string }) {
  return (
    <span className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5">
      {fuentes.map((f) => (
        <span key={f.clave} className="inline-flex items-center gap-2 text-[0.82rem] text-muted" title={f.lugar}>
          <Chip clave={f.clave} />
          {prefijo && f.fecha ? <>{prefijo} {fecha(f.fecha)}</> : <span className="hidden sm:inline">{f.lugar}</span>}
        </span>
      ))}
    </span>
  );
}
const Sub = ({ children }: { children: React.ReactNode }) => <small className="block text-[0.82rem] text-muted">{children}</small>;

function PedirExamen({ dni, catalogo }: { dni: string; catalogo: { codigo: string; nombre: string }[] }) {
  const [codigo, setCodigo] = useState(catalogo[0].codigo);
  const [estado, setEstado] = useState<"idle" | "cargando" | { p: Pedido } | { error: string }>("idle");
  const evaluar = async () => {
    setEstado("cargando");
    try { setEstado({ p: await api.pedirExamen(dni, codigo) }); }
    catch (e) { setEstado({ error: (e as Error).message }); }
  };
  return (
    <section className={panel} aria-labelledby="pedido-t">
      <h2 id="pedido-t" className="text-lg font-semibold">Pedir un examen</h2>
      <p className="mt-1 text-sm text-muted">Herramienta orientativa: muestra si existe una prueba previa similar; la decisión de solicitarla corresponde al profesional.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="examen" className="text-sm font-medium">Examen</label>
          <select id="examen" value={codigo} onChange={(e) => setCodigo(e.target.value)} className="mt-1.5 block min-h-11 w-full rounded-ctl border border-line bg-bg px-3">
            {catalogo.map((c) => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
          </select>
        </div>
        <button type="button" onClick={evaluar} disabled={estado === "cargando"} className={btn.primary}>Evaluar pedido</button>
      </div>
      <div className="mt-4" role="status" aria-live="polite">
        {estado === "cargando" && <div className="sk h-14" />}
        {typeof estado === "object" && "error" in estado && <Aviso tipo="err" icono={<Warning size={24} aria-hidden />} titulo="No se pudo evaluar"><p>{estado.error}</p></Aviso>}
        {typeof estado === "object" && "p" in estado && (estado.p.duplicado ? (
          <Aviso tipo="warn" icono={<Warning size={24} aria-hidden />} titulo="Examen previo relacionado">
            <p>{estado.p.examen} se hizo hace {estado.p.dias} días en {estado.p.previo?.establecimiento} (resultado: {estado.p.previo?.resultado}). Ventana de {estado.p.ventana} días.</p>
          </Aviso>
        ) : (
          <Aviso tipo="ok" icono={<CheckCircle size={24} aria-hidden />} titulo="No se encontraron coincidencias en las fuentes consultadas">
            <p>{estado.p.examen}. {estado.p.previo ? `El último fue hace ${estado.p.dias} días en ${estado.p.previo.establecimiento}, fuera de la ventana de ${estado.p.ventana} días.` : "No hay registros previos."}</p>
          </Aviso>
        ))}
      </div>
    </section>
  );
}

export function ResultadoResumen({
  r, catalogo, accesosKey, terminologia, onRevocar, encabezadoRef,
}: { r: Resumen; catalogo: { codigo: string; nombre: string }[]; accesosKey: number; terminologia: Terminologia; onRevocar: () => void; encabezadoRef: RefObject<HTMLHeadingElement | null> }) {
  const caidos = r.establecimientos.filter((e) => e.estado === "no_disponible");
  const todos = api.accesos(r.dni);
  const accesos = todos.slice(0, 6);
  const otorgado = todos.find((a) => a.resultado === "consentimiento" && a.motivo === "otorgado");
  void accesosKey;
  const palabras = r.nombre.split(" ");
  const iniciales = ((palabras[0]?.[0] ?? "") + (palabras[1]?.[0] ?? "")).toUpperCase();
  const resumen = [
    { href: "#atenciones", n: r.atenciones.length, texto: "Atenciones" },
    { href: "#examenes", n: r.examenes.length, texto: "Exámenes" },
    { href: "#medicamentos", n: r.medicamentos.length, texto: "Medicamentos" },
    { href: "#alergias", n: r.alergias.length, texto: "Alergias" },
    { href: "#condiciones", n: r.condiciones.length, texto: "Condiciones" },
  ];
  return (
    <article className="grid gap-4" aria-labelledby="pac-nombre">
      <p className="rounded-ctl border border-warn-line bg-warn-bg p-3 text-sm font-medium text-ink" role="note">ENTORNO ACADÉMICO · Todos los pacientes, médicos, atenciones y resultados son ficticios. Los nombres de sedes de SJL se usan como referencia geográfica, no como conexión real. El simulador no cuenta aún con login profesional ni verificación oficial de autorizaciones.</p>
      <section className={panel}>
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-accent-soft text-lg font-bold tracking-tight text-accent-strong">{iniciales}</span>
            <div>
              <h2 id="pac-nombre" ref={encabezadoRef} tabIndex={-1} className="text-[clamp(1.6rem,1.2rem+1.4vw,2.2rem)] font-bold leading-tight tracking-tight">{r.nombre}</h2>
              <p className="mt-1 text-sm text-muted"><span className="font-mono">DNI {r.dni}</span>, {r.edad} años, {sexo(r.sexo)}</p>
            </div>
          </div>
          <div className="sm:text-right">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted">Consentimiento del paciente</p>
            <span className="mt-1.5 inline-flex items-center gap-2 rounded-full bg-ok-bg py-1 pl-3.5 pr-1 text-sm font-medium text-ok">
              <ShieldCheck size={18} aria-hidden /> Autorizado{otorgado ? ` · ${fechaHora(otorgado.cuando)}` : ""}
              <button type="button" onClick={onRevocar} className="rounded-full bg-surface-2 px-3 py-1.5 text-[0.82rem] font-semibold text-ink hover:bg-line">Revocar</button>
            </span>
          </div>
        </div>

        {r.alergias.length > 0 && (
          <div role="note" className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-ctl border border-danger-line bg-danger-bg px-4 py-2.5 text-danger">
            <span className="inline-flex items-center gap-2 text-[0.9rem] font-bold"><Warning size={18} weight="fill" aria-hidden /> Alergias</span>
            <span className="text-[0.95rem] font-semibold">{r.alergias.map((a) => a.sustancia).join(", ")}</span>
          </div>
        )}

        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {resumen.map((t) => (
            <li key={t.href}>
              <a href={t.href} className="group block rounded-ctl border border-line bg-bg px-4 py-3 no-underline transition-colors hover:border-accent/50 hover:bg-accent-soft">
                <span className="block text-[1.7rem] font-bold leading-none tracking-tight tabular-nums text-ink">{t.n}</span>
                <span className="mt-1 block text-[0.82rem] text-muted group-hover:text-ink">{t.texto}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-line pt-4 text-[0.85rem]">
          {r.establecimientos.map((e) => e.estado === "no_disponible"
            ? <span key={e.clave} className="inline-flex items-center gap-2 font-medium text-danger"><Chip clave={e.clave} /> <CloudSlash size={16} aria-hidden /> No disponible</span>
            : <span key={e.clave} className="inline-flex items-center gap-2"><Chip clave={e.clave} /> <code className="font-mono text-[0.8rem] text-muted">{e.idLocal}</code></span>)}
        </div>
      </section>

      {caidos.length > 0 && (
        <Aviso tipo="err" icono={<CloudSlash size={28} aria-hidden />} titulo="Historial incompleto">
          <p>No se pudo consultar {caidos.map((c) => SISTEMAS[c.clave].nombre).join(" ni ")}. Sus datos no aparecen en este resumen.</p>
        </Aviso>
      )}

      {r.repetidos.length > 0 ? (
        <Aviso tipo="warn" icono={<Warning size={28} aria-hidden />} titulo={`${r.repetidos.length} ${r.repetidos.length === 1 ? "posible coincidencia" : "posibles coincidencias"} de exámenes previos`}>
          <ul>{r.repetidos.map((a) => <li key={a.codigo + a.fechaRepeticion}>{mensajeAlerta(a)}</li>)}</ul>
        </Aviso>
      ) : (
        <Aviso tipo="ok" icono={<CheckCircle size={28} aria-hidden />} titulo="Sin coincidencias detectadas en las fuentes consultadas">
          <p>No se identificaron exámenes relacionados dentro de las ventanas temporales de demostración. Esto no garantiza que no existan estudios anteriores.</p>
        </Aviso>
      )}

      <PedirExamen dni={r.dni} catalogo={catalogo} />

      <HistorialAtenciones r={r} />
      <ExamenesFiltrados r={r} />
      <div className="grid gap-4 sm:grid-cols-2">
        <section id="medicamentos" className={panel}><h2 className="text-lg font-semibold">Medicamentos</h2>
          <p className="mt-1 text-[0.82rem] text-muted">Tratamiento indicado según cada sistema y fecha de la receta.</p>
          <Lista items={r.medicamentos} fila={(m) => <><span className="font-medium">{m.nombre}</span>
          <span className="mt-1 block text-xs font-medium text-muted">{m.fuentes.some(f=>f.estado==='active')?'Vigencia según registro: activa o continuada':m.fuentes.every(f=>f.estado==='completed')?'Tratamiento registrado como finalizado':'Estado sin confirmar'}</span>
          <Origenes fuentes={m.fuentes} prefijo="documentado el" />
          {m.fuentes.some(f=>f.fin)&&<span className="mt-1 block text-xs text-muted">Fecha final indicada: {m.fuentes.filter(f=>f.fin).map(f=>fecha(f.fin!)).join(', ')}</span>}</>} /></section>
        <section id="alergias" className={panel}><h2 className="text-lg font-semibold">Alergias</h2>
          <Lista items={r.alergias} fila={(a) => <><span className="block font-semibold text-danger">{a.sustancia}</span>{a.reaccion}<Origenes fuentes={a.fuentes} /></>} /></section>
      </div>
      <section id="condiciones" className={panel}><h2 className="text-lg font-semibold">Condiciones</h2>
        <Lista items={r.condiciones} fila={(c) => <>{c.nombre}<Sub>CIE-10 {c.codigo}</Sub><Origenes fuentes={c.fuentes} prefijo="desde" /></>} /></section>

      <DirectorioSJL />
      <section className={panel}>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-[0.95rem] font-semibold [&::-webkit-details-marker]:hidden">
            <ArrowsClockwise size={18} aria-hidden className="transition-transform group-open:rotate-180" /> Cómo se armó este resumen
          </summary>
          <table className="mt-4 w-full border-collapse text-[0.9rem]">
            <thead><tr className="text-left text-[0.8rem] text-muted">{["Sistema", "Peticiones", "Exámenes", "Tiempo", "Estado"].map((h) => <th key={h} scope="col" className="border-b border-line px-3 py-2 font-medium">{h}</th>)}</tr></thead>
            <tbody>
              {r.traza.sistemas.map((s) => (
                <tr key={s.clave}>
                  <td className="border-b border-line px-3 py-2.5"><Chip clave={s.clave} /></td>
                  <td className="border-b border-line px-3 py-2.5 tabular-nums">{s.peticiones}</td>
                  <td className="border-b border-line px-3 py-2.5 tabular-nums">{s.estado === "ok" ? s.examenes : "-"}</td>
                  <td className="border-b border-line px-3 py-2.5 font-mono text-[0.85rem] tabular-nums">{ms(s.ms)}</td>
                  <td className={`border-b border-line px-3 py-2.5 font-medium ${s.estado === "ok" ? "text-ok" : s.estado === "no_disponible" ? "text-danger" : "text-muted"}`}>
                    {s.estado === "ok" ? "Respondió" : s.estado === "no_disponible" ? "No disponible" : "Sin registro"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-muted">
            Se unificaron {r.traza.examenes} exámenes, los de la tabla de exámenes: {r.traza.sistemas.filter((s) => s.examenes).map((s) => `${s.examenes} de ${SISTEMAS[s.clave].corto}`).join(" y ")}.{r.traza.traducidos ? ` ${r.traza.traducidos} llegaron con código local y se tradujeron a LOINC.` : ""} Las consultas corren en paralelo, por eso el tiempo total fue {ms(r.traza.total)} y no la suma de cada sistema.
            {terminologia.version && ` Nombres de los exámenes verificados en el servicio de terminología de HL7 (tx.fhir.org), LOINC ${terminologia.version}.`}
          </p>
        </details>
      </section>

      <section className={panel}>
        <h2 className="text-lg font-semibold">Quién consultó este historial</h2>
        <Lista items={accesos} vacio="Sin accesos registrados todavía." fila={(a) => (
          <div className="flex items-start justify-between gap-4">
            <span>{a.quien}<Sub>{[a.lugar, a.motivo].filter(Boolean).join(" · ")}</Sub></span>
            <span className={`text-right ${a.resultado === "denegado" ? "font-semibold text-danger" : ""}`}>{a.resultado}<Sub>{fechaHora(a.cuando)}</Sub></span>
          </div>
        )} />
      </section>
    </article>
  );
}
