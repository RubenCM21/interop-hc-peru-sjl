"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CheckCircle, Warning } from "@phosphor-icons/react";
import { api, SISTEMAS, type Clave, type Resumen } from "@/lib/gateway";
import { Chip, btn, ms } from "./ui";
import { mensajeAlerta } from "./textos";
import { EnPantalla } from "./en-pantalla";

const CLAVES = Object.keys(SISTEMAS) as Clave[];
const XS = [50, 150, 250];

// Los tres sistemas consultados y las líneas que convergen en el paciente.
function Fuentes({ r }: { r: Resumen | null }) {
  return (
    <div>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {CLAVES.map((k, i) => {
          const s = r?.traza.sistemas.find((x) => x.clave === k);
          const conDatos = s?.estado === "ok";
          return (
            <motion.li
              key={k}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: r ? 1 : 0.5, y: 0 }}
              transition={{ delay: 0.1 + i * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className={`rounded-ctl border bg-surface px-2.5 py-2 text-center ${conDatos ? "border-accent/40" : "border-line"} ${r && !conDatos ? "opacity-60" : ""}`}
            >
              <Chip clave={k} />
              <span className={`mt-1 block font-mono text-[0.72rem] ${conDatos ? "text-ok" : "text-muted"}`}>
                {!r ? "consultando" : conDatos ? ms(s!.ms) : "sin registro"}
              </span>
            </motion.li>
          );
        })}
      </ul>
      <svg viewBox="0 0 300 56" preserveAspectRatio="none" className="h-14 w-full text-line" aria-hidden="true" focusable="false">
        {XS.map((x, i) => {
          const d = `M${x} 0 C ${x} 30, 150 26, 150 56`;
          const activo = r?.traza.sistemas.find((s) => s.clave === CLAVES[i])?.estado === "ok";
          return (
            <g key={x}>
              <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
              {activo && <path d={d} className="linea-flujo" vectorEffect="non-scaling-stroke" />}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// Ejemplo vivo: consulta de verdad la pasarela y muestra cómo respondió cada sistema.
export function HeroCard() {
  const [r, setR] = useState<Resumen | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let vivo = true;
    api.vistaPrevia("90000001").then((x) => vivo && setR(x), () => vivo && setError(true));
    return () => { vivo = false; };
  }, []);

  return (
    <EnPantalla>
      <Fuentes r={r} />
      <aside
        aria-label="Ejemplo de resumen unificado"
        aria-busy={!r && !error}
        className="relative -mt-px rounded-[1.25rem] border border-line bg-surface p-5 shadow-card sm:p-7"
      >
        {error && <p className="text-sm text-muted">No se pudo cargar el ejemplo.</p>}
        {!r && !error && (
          <div className="space-y-3" aria-hidden="true">
            <div className="sk h-7 w-3/5" /><div className="sk h-4 w-2/5" /><div className="sk h-24" />
          </div>
        )}
        {r && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <p className="font-mono text-[0.8rem] text-muted">DNI {r.dni} · {r.edad} años</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{r.nombre}</h2>

            {r.repetidos.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 space-y-2 rounded-ctl border border-warn-line bg-warn-bg p-3.5 text-[0.9rem] text-warn"
              >
                {r.repetidos.slice(0, 2).map((a) => (
                  <li key={a.codigo + a.fechaRepeticion} className="flex gap-2.5">
                    <Warning size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden />
                    <span>{mensajeAlerta(a)}</span>
                  </li>
                ))}
              </motion.ul>
            )}

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-[0.82rem] text-muted">
                <CheckCircle size={16} weight="fill" className="text-ok" aria-hidden /> Armado en {ms(r.traza.total)}
              </p>
              <Link href="/visor/90000001" className={`${btn.secondary} ${btn.sm}`}>
                Abrir en el visor <ArrowRight size={16} aria-hidden />
              </Link>
            </div>
          </motion.div>
        )}
      </aside>
    </EnPantalla>
  );
}
