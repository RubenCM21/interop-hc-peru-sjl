"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle, ListChecks, XCircle } from "@phosphor-icons/react";
import { ErrorApi, api, type Caso, type EstadoSistema, type Resumen, type Terminologia } from "@/lib/gateway";
import { Chip, btn, contenedor, panel } from "../ui";
import { ResultadoError, ResultadoResumen, Cargando } from "./resultado";

type Estado =
  | { tipo: "vacio" }
  | { tipo: "cargando" }
  | { tipo: "ok"; r: Resumen }
  | { tipo: "error"; e: { codigo: string; message: string } };

export function Visor({ dni }: { dni?: string }) {
  const router = useRouter();
  const [casos, setCasos] = useState<Caso[]>(() => api.casosBase());
  const [sistemas, setSistemas] = useState<EstadoSistema[]>(() => api.sistemas());
  const [estado, setEstado] = useState<Estado>({ tipo: "vacio" });
  const [accesos, setAccesos] = useState(0); // fuerza el repintado del registro
  const [campo, setCampo] = useState(dni ?? "");
  const [aviso, setAviso] = useState("");
  const turno = useRef(0);
  const refEncabezado = useRef<HTMLHeadingElement>(null);

  const catalogo = useRef(api.catalogo()).current;

  const consultar = useCallback(async (d: string) => {
    const mio = ++turno.current;
    setEstado({ tipo: "cargando" });
    try {
      const r = await api.resumen(d);
      if (mio === turno.current) setEstado({ tipo: "ok", r });
    } catch (e) {
      if (mio === turno.current) {
        const err = e as ErrorApi;
        setEstado({ tipo: "error", e: { codigo: err.codigo ?? "error", message: err.message } });
      }
    }
    if (mio === turno.current) {
      setCasos(api.casos());
      setAccesos((n) => n + 1);
    }
  }, []);

  const [terminologia, setTerminologia] = useState<Terminologia>({ version: null, items: {} });

  useEffect(() => {
    setCasos(api.casos());
    setSistemas(api.sistemas());
    api.terminologia().then(setTerminologia);
  }, []);

  useEffect(() => {
    setCampo(dni ?? "");
    if (dni) consultar(dni);
    else { turno.current++; setEstado({ tipo: "vacio" }); }
  }, [dni, consultar]);

  const ir = (d: string) => {
    if (d === dni) consultar(d);
    else router.push(`/visor/${d}`, { scroll: false });
  };

  const enviar = (ev: FormEvent) => {
    ev.preventDefault();
    const d = campo.trim();
    if (!/^\d{8}$/.test(d)) {
      setAviso("Ingrese un DNI de 8 dígitos, por ejemplo 90000001.");
      return;
    }
    setAviso("");
    ir(d);
  };

  const alternarSistema = (s: EstadoSistema) => {
    api.fijarEnLinea(s.clave, !s.enLinea);
    setSistemas(api.sistemas());
    if (dni) consultar(dni);
  };

  const autorizar = (d: string, ok: boolean) => {
    api.consentimiento(d, ok);
    setCasos(api.casos());
    if (ok) consultar(d);
    else {
      turno.current++;
      setEstado({ tipo: "error", e: { codigo: "sin_consentimiento", message: "El paciente revocó su consentimiento." } });
      setAccesos((n) => n + 1);
    }
  };

  return (
    <div className={`${contenedor} grid items-start gap-6 py-10 lg:grid-cols-[19rem_minmax(0,1fr)] lg:gap-8`}>
      <div className="lg:col-span-2">
        <h1 className="text-[clamp(1.9rem,1.2rem+2.4vw,3rem)] font-bold leading-[1.05] tracking-tight">Visor de historia clínica</h1>
        <p className="mt-2 max-w-[60ch] text-muted">Prototipo de SJL: consulte pacientes ficticios por DNI. Agrupa atenciones, exámenes y tratamientos de tres fuentes simuladas; no consulta datos reales.</p>
      </div>

      <aside aria-label="Búsqueda y controles" className="grid content-start gap-4">
        <section className={panel} aria-labelledby="v-buscar">
          <h2 id="v-buscar" className="text-base font-semibold">Consultar paciente</h2>
          <form onSubmit={enviar} noValidate className="mt-4">
            <label htmlFor="dni" className="text-sm font-medium">DNI del paciente</label>
            <input
              id="dni" name="dni" inputMode="numeric" maxLength={8} autoComplete="off" placeholder="90000001"
              value={campo} onChange={(e) => setCampo(e.target.value.replace(/\D/g, ""))}
              aria-invalid={aviso ? true : undefined} aria-describedby="dni-ayuda"
              className="mt-1.5 block min-h-11 w-full rounded-ctl border border-line bg-bg px-3.5 font-mono text-base tracking-wide aria-[invalid=true]:border-danger"
            />
            <p id="dni-ayuda" className={`mt-1.5 text-[0.82rem] ${aviso ? "text-danger" : "text-muted"}`} role={aviso ? "alert" : undefined}>
              {aviso || "8 dígitos. Los DNI de demostración empiezan en 9000."}
            </p>
            <button type="submit" className={`${btn.primary} mt-4 w-full`}>Consultar historial</button>
          </form>
        </section>

        <section className={panel} aria-labelledby="v-casos">
          <h2 id="v-casos" className="text-base font-semibold">Casos de demostración</h2>
          <ul className="mt-3 grid gap-1">
            {casos.filter((c) => c.titulo).map((c) => (
              <li key={c.dni}>
                <button
                  type="button" onClick={() => ir(c.dni)} aria-current={c.dni === dni ? "true" : undefined}
                  className="w-full rounded-ctl border border-transparent px-3 py-2.5 text-left transition-colors hover:bg-surface-2 aria-[current=true]:border-accent/50 aria-[current=true]:bg-accent-soft"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[0.92rem] font-medium">{c.nombre}</span>
                    <span className="font-mono text-[0.75rem] text-muted">{c.dni}</span>
                  </span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {c.sistemas.map((k) => <Chip key={k} clave={k} />)}
                    {!c.consentimiento && (
                      <span className="rounded-full border border-danger/40 bg-danger/10 px-2.5 py-0.5 text-[0.8rem] font-medium text-danger">Sin consentimiento</span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section className={panel} aria-labelledby="v-sis">
          <h2 id="v-sis" className="text-base font-semibold">Sistemas conectados</h2>
          <ul className="mt-3 grid gap-2">
            {sistemas.map((s) => (
              <li key={s.clave}>
                <button
                  type="button" role="switch" aria-checked={s.enLinea} onClick={() => alternarSistema(s)}
                  aria-label={`${s.nombre}: ${s.enLinea ? "en línea" : "caído"}. Activar para cambiar`}
                  className="flex w-full items-center justify-between gap-3 rounded-ctl bg-surface-2 px-3.5 py-2.5 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--surface-2)_80%,var(--ink))]"
                >
                  <span className="text-[0.92rem] font-medium">{s.nombre}<br /><small className="text-[0.8rem] font-normal text-muted">{s.establecimiento}</small></span>
                  <span className={`flex shrink-0 items-center gap-1 whitespace-nowrap text-[0.82rem] font-semibold ${s.enLinea ? "text-ok" : "text-danger"}`}>
                    {s.enLinea ? <CheckCircle size={16} aria-hidden /> : <XCircle size={16} aria-hidden />}
                    {s.enLinea ? "En línea" : "Caído"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[0.82rem] text-muted">Apague uno para simular una caída y vea cómo responde el visor.</p>
        </section>
      </aside>

      <div className="grid min-h-[85dvh] min-w-0 content-start gap-4" aria-live="polite">
        {
          <motion.div
            key={estado.tipo === "ok" ? `ok-${estado.r.dni}` : estado.tipo}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="grid gap-4"
          >
            {estado.tipo === "vacio" && (
              <div className={`${panel} grid justify-items-center gap-2 py-14 text-center`}>
                <ListChecks size={36} className="text-accent-strong" aria-hidden />
                <h2 className="text-xl font-semibold">Elija un caso o ingrese un DNI</h2>
                <p className="max-w-[48ch] text-muted">El simulador reúne atenciones ficticias atribuidas a sedes referenciales de SJL y muestra exámenes previos relacionados.</p>
              </div>
            )}
            {estado.tipo === "cargando" && <Cargando />}
            {estado.tipo === "error" && <ResultadoError e={estado.e} onAutorizar={() => dni && autorizar(dni, true)} />}
            {estado.tipo === "ok" && (
              <ResultadoResumen
                r={estado.r} catalogo={catalogo} accesosKey={accesos} terminologia={terminologia}
                onRevocar={() => autorizar(estado.r.dni, false)} encabezadoRef={refEncabezado}
              />
            )}
          </motion.div>
        }
      </div>
    </div>
  );
}
