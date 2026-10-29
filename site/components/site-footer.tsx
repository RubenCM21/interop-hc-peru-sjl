import Link from "next/link";
import { contenedor } from "./ui";

const RENIPRESS =
  "https://www.datosabiertos.gob.pe/dataset/registro-nacional-de-entidades-prestadoras-de-servicios-de-salud-renipress";

const columnas = [
  {
    titulo: "Producto",
    enlaces: [
      { href: "/visor", texto: "Visor de historia clínica" },
      { href: "/visor/90000001", texto: "Ver un caso" },
      { href: "/#como-funciona", texto: "Cómo funciona" },
    ],
  },
  {
    titulo: "Estándares",
    enlaces: [
      { href: "https://hl7.org/fhir/R4/", texto: "HL7 FHIR R4", externo: true },
      { href: "https://loinc.org", texto: "LOINC", externo: true },
      { href: RENIPRESS, texto: "RENIPRESS, SUSALUD", externo: true },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-line">
      <div className={`${contenedor} grid gap-8 py-8 sm:grid-cols-[1.4fr_1fr_1fr]`}>
        <div>
          <Link href="/" className="font-mono text-[0.95rem] font-medium tracking-tight text-ink no-underline">
            interop<span className="text-accent-strong">-hc-</span>peru
          </Link>
          <p className="mt-3 max-w-[32ch] text-[0.95rem] text-muted">
            El historial clínico del paciente, unificado entre Minsa, EsSalud y clínicas.
          </p>
        </div>
        {columnas.map((c) => (
          <nav key={c.titulo} aria-label={c.titulo}>
            <h2 className="text-[0.8rem] font-semibold uppercase tracking-[0.08em] text-muted">{c.titulo}</h2>
            <ul className="mt-3 space-y-2 text-[0.95rem]">
              {c.enlaces.map((e) => (
                <li key={e.texto}>
                  {"externo" in e ? (
                    <a href={e.href} rel="noopener" className="text-ink underline-offset-4 hover:text-accent-strong hover:underline">{e.texto}</a>
                  ) : (
                    <Link href={e.href} className="text-ink underline-offset-4 hover:text-accent-strong hover:underline">{e.texto}</Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-line">
        <div className={`${contenedor} flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-5 text-[0.82rem] text-muted`}>
          <p>© 2026 interop-hc-peru</p>
          <p>Versión de demostración. Los pacientes y sus registros son ficticios.</p>
        </div>
      </div>
    </footer>
  );
}
