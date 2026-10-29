import { SISTEMAS, type Clave } from "@/lib/data";
import { Chip } from "./ui";

// Diagrama: visor -> capa de interoperabilidad -> tres sistemas. El flujo es una línea punteada animada por CSS
// solo mientras el bloque es visible y con movimiento permitido (ver .linea-flujo en globals.css).
const ALTO = 288;
const ys = [44, 144, 244];
const claves = Object.keys(SISTEMAS) as Clave[];

function Abanico() {
  return (
    <svg viewBox={`0 0 160 ${ALTO}`} preserveAspectRatio="none" className="hidden h-72 min-w-20 flex-1 text-line lg:block" aria-hidden="true">
      {ys.map((y, i) => {
        const d = `M0 144 C 90 144, 70 ${y}, 160 ${y}`;
        return (
          <g key={y}>
            <path d={d} fill="none" stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            <path d={d} fill="none" className="linea-flujo" vectorEffect="non-scaling-stroke" />
          </g>
        );
      })}
    </svg>
  );
}

function Recto({ invertido }: { invertido?: boolean }) {
  const d = invertido ? "M160 4 L0 4" : "M0 4 L160 4";
  return (
    <svg viewBox="0 0 160 8" preserveAspectRatio="none" className="hidden h-2 min-w-12 flex-1 text-line lg:block" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      <path d={d} className="linea-flujo" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Vertical() {
  return <div className="mx-auto h-8 w-px bg-line lg:hidden" aria-hidden="true" />;
}

export function Flujo() {
  return (
    <div className="flex flex-col items-stretch lg:flex-row lg:items-center lg:justify-between">
      <div className="rounded-card border border-line bg-surface p-5 shadow-card lg:w-56">
        <h3 className="text-[1.05rem] font-semibold">Visor del médico</h3>
        <p className="mt-1.5 text-[0.92rem] text-muted">Pide el historial por DNI y muestra el resumen.</p>
      </div>
      <Vertical /><Recto />
      <div className="rounded-card border-2 border-accent/60 bg-accent-soft p-5 shadow-card lg:w-72">
        <h3 className="text-[1.05rem] font-semibold">Capa de interoperabilidad</h3>
        <p className="mt-1.5 text-[0.92rem] text-ink/80">
          Consulta en paralelo, traduce códigos locales a LOINC, une por DNI y aplica el consentimiento.
        </p>
      </div>
      <Vertical /><Abanico />
      <ul className="flex flex-col gap-3 lg:w-80">
        {claves.map((k) => (
          <li key={k} className="flex flex-col justify-center rounded-card border border-line bg-surface px-4 py-3.5 shadow-card lg:h-[5.5rem]">
            <span className="flex items-center justify-between gap-2">
              <Chip clave={k} />
              <span className="font-mono text-[0.75rem] text-muted">RENIPRESS {SISTEMAS[k].cod}</span>
            </span>
            <span className="mt-1.5 text-[0.95rem] font-medium">{SISTEMAS[k].establecimiento}</span>
            <span className="text-[0.8rem] text-muted">{SISTEMAS[k].distrito}, categoría {SISTEMAS[k].categoria}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
