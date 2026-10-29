import Link from "next/link";
import { ArrowRight, Copy, GitMerge, PlugsConnected, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { CASOS, type Clave } from "@/lib/data";
import { HeroCard } from "@/components/hero-card";
import { Flujo } from "@/components/flujo";
import { CountUp } from "@/components/count-up";
import { Reveal } from "@/components/reveal";
import { EnPantalla } from "@/components/en-pantalla";
import { Chip, btn, contenedor } from "@/components/ui";
import { EcgVivo } from "@/components/ecg-vivo";

const LINKS = {
  dyer: "https://www.infobae.com/peru/2026/08/06/ministro-de-salud-luis-dyer-revela-que-archivos-del-minsa-aun-se-guardan-en-cd-estamos-en-el-ano-95/",
  sihce: "https://www.estudiorodrigo.com/publicaciones/life-sciences-producto-legal-implementacion-de-las-historias-clinicas-electronicas-en-el-peru",
  renipress: "https://www.datosabiertos.gob.pe/dataset/registro-nacional-de-entidades-prestadoras-de-servicios-de-salud-renipress",
};

const cifras = [
  { valor: 54, dec: 0, sufijo: " %", texto: "de los 7 400 establecimientos del Minsa no tiene acceso a internet", fuente: "Ministro Dyer, ago. 2026", href: LINKS.dyer },
  { valor: 5.5, dec: 1, sufijo: " %", texto: "de las IPRESS de primer nivel tiene el SIHCE completo", fuente: "Minsa, jun. 2025", href: LINKS.sihce },
  { valor: 26972, dec: 0, sufijo: "", texto: "establecimientos activos en el registro nacional, cada uno con su propio historial", fuente: "RENIPRESS, sep. 2026", href: LINKS.renipress },
  { valor: 4, dec: 0, sufijo: " de 4", texto: "pacientes entrevistados repitieron exámenes y cargaron sus resultados", fuente: "Entrevistas del equipo", href: undefined },
];

const funciones = [
  { icono: GitMerge, titulo: "Un historial por DNI", texto: "Consulta los tres sistemas en paralelo y une medicamentos, alergias y exámenes, indicando de dónde viene cada dato." },
  { icono: Copy, titulo: "Alerta de exámenes repetidos", texto: "Detecta repeticiones entre establecimientos y avisa antes de pedir un examen que ya existe." },
  { icono: ShieldCheck, titulo: "Consentimiento y trazabilidad", texto: "El paciente autoriza el acceso y queda registrado quién consultó su historial." },
  { icono: PlugsConnected, titulo: "Sigue funcionando si un sistema cae", texto: "El visor muestra lo disponible y marca el historial como incompleto en lugar de fallar." },
];

const casos = CASOS.filter((c) => c.titulo);

// Cinta de casos. La segunda copia cierra el bucle de la animación y queda fuera del teclado y de los lectores de pantalla.
function ListaCasos({ duplicado }: { duplicado?: boolean }) {
  return (
    <ul className={`flex gap-4 ${duplicado ? "marquee-dup" : ""}`} aria-hidden={duplicado || undefined} inert={duplicado || undefined}>
      {casos.map((c) => (
        <li key={c.dni} className="flex">
          <article className="flex w-80 shrink-0 flex-col gap-3 rounded-card border border-line bg-surface p-5">
            <span className="font-mono text-[0.8rem] text-muted">DNI {c.dni}</span>
            <div>
              <h3 className="text-[1.05rem] font-semibold leading-snug">{c.titulo}</h3>
              <p className="mt-0.5 text-[0.9rem] text-muted">{c.nombres} {c.apellidos}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">{(c.sistemas as Clave[]).map((k) => <Chip key={k} clave={k} />)}</div>
            <p className="flex-1 text-[0.92rem] text-muted">{c.muestra}</p>
            <Link href="/ingresar" className={`${btn.secondary} ${btn.sm} self-start`}>
              Solicitar acceso <ArrowRight size={16} aria-hidden />
            </Link>
          </article>
        </li>
      ))}
    </ul>
  );
}

export default function Inicio() {
  return (
    <>
      <div className="relative isolate overflow-hidden">
        <div aria-hidden="true" className="fondo-puntos absolute inset-0 -z-20" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-3 -z-10 h-28 overflow-hidden">
          <EcgVivo className="block h-full w-full" />
          <div className="absolute inset-y-0 left-0 w-[10%] bg-gradient-to-r from-bg to-transparent" />
          <div className="absolute inset-y-0 right-0 w-[10%] bg-gradient-to-l from-bg to-transparent" />
        </div>
        <section className={`${contenedor} grid items-center gap-10 py-10 sm:py-12 lg:min-h-[calc(100dvh-4rem)] lg:grid-cols-[1.1fr_0.9fr] lg:gap-20`} aria-labelledby="h-hero">
          <div>
            <p className="entrada mb-5 inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[0.82rem] font-medium text-muted">
              <span className="size-1.5 rounded-full bg-accent" aria-hidden="true" /> Prototipo académico · SJL · FHIR R4
            </p>
            <h1 id="h-hero" className="text-[clamp(2.4rem,1.1rem+4.6vw,4.4rem)] font-bold leading-[1.02] tracking-[-0.04em]">
              El historial del paciente, en una sola vista
            </h1>
            <p className="entrada mt-6 max-w-[34ch] text-[clamp(1.05rem,0.95rem+0.5vw,1.3rem)] leading-normal text-muted" style={{ "--d": "0.15s" } as React.CSSProperties}>
              Simula el intercambio de información entre establecimientos de San Juan de Lurigancho y encuentra resultados anteriores del paciente.
            </p>
            <div className="entrada mt-8 flex flex-wrap gap-3" style={{ "--d": "0.25s" } as React.CSSProperties}>
              <Link href="/visor" className={btn.primary}>Abrir el visor <ArrowRight size={18} aria-hidden /></Link>
              <a href="#como-funciona" className={btn.ghost}>Cómo funciona</a>
            </div>
          </div>
          <HeroCard />
        </section>
      </div>

      <Reveal as="section" className={`${contenedor} py-14 sm:py-20`}>
        <h2 className="max-w-[24ch] text-[clamp(1.6rem,1.1rem+1.8vw,2.4rem)] font-semibold">Hoy el historial no viaja con el paciente</h2>
        <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {cifras.map((c) => (
            <li key={c.fuente} className="flex flex-col border-t-2 border-accent pt-4">
              <p className="order-1 text-[clamp(2.4rem,2rem+1.6vw,3.4rem)] font-bold leading-none tracking-tight">
                <CountUp valor={c.valor} decimales={c.dec} />
                <small className="ml-0.5 text-[0.5em] font-semibold text-muted">{c.sufijo}</small>
              </p>
              <p className="order-2 mt-3 text-[0.95rem] text-muted">{c.texto}</p>
              {c.href ? (
                <a href={c.href} rel="noopener" className="order-3 mt-3 text-[0.8rem] text-accent-strong underline underline-offset-[3px]">{c.fuente}</a>
              ) : (
                <span className="order-3 mt-3 text-[0.8rem] text-muted">{c.fuente}</span>
              )}
            </li>
          ))}
        </ul>
      </Reveal>

      <Reveal as="section" className={`${contenedor} grid gap-10 py-14 sm:py-20 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20`}>
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-[clamp(1.6rem,1.1rem+1.8vw,2.4rem)] font-semibold">Qué resuelve el prototipo</h2>
          <p className="mt-3 max-w-[34ch] text-muted">Cuatro capacidades pensadas para el momento de la consulta.</p>
        </div>
        <ul className="divide-y divide-line border-y border-line">
          {funciones.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo} className="flex gap-4 py-6">
              <span className="grid size-11 shrink-0 place-items-center rounded-ctl bg-accent-soft text-accent-strong"><Icono size={22} aria-hidden /></span>
              <div>
                <h3 className="text-[1.05rem] font-semibold">{titulo}</h3>
                <p className="mt-1 max-w-[52ch] text-muted">{texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </Reveal>

      <section className="py-14 sm:py-20">
        <div className={contenedor}>
          <h2 className="text-[clamp(1.6rem,1.1rem+1.8vw,2.4rem)] font-semibold">Seis casos para probar</h2>
          <p className="mt-3 max-w-[52ch] text-muted">Cada uno muestra una situación distinta. Ábralos en el visor y compare.</p>
        </div>
        <EnPantalla><div className="marquee mt-10" role="region" aria-label="Casos de demostración">
          <div className="marquee-track">
            <ListaCasos />
            <ListaCasos duplicado />
          </div>
        </div></EnPantalla>
      </section>

      <Reveal as="section" className={`${contenedor} py-14 sm:py-20`}>
        <h2 id="como-funciona" className="mb-10 text-[clamp(1.6rem,1.1rem+1.8vw,2.4rem)] font-semibold">Cómo se conectan los sistemas</h2>
        <EnPantalla><Flujo /></EnPantalla>
      </Reveal>

      <Reveal as="section" className={`${contenedor} pb-6 pt-8 sm:pt-12`}>
        <div
          className="relative overflow-hidden rounded-[1.5rem] bg-ink px-6 py-10 text-bg sm:px-12 sm:py-12"
          style={{ backgroundImage: "radial-gradient(60% 120% at 100% 0%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%)" }}
        >
          <h2 className="relative max-w-[20ch] text-[clamp(1.8rem,1.2rem+2.4vw,3rem)] font-bold leading-[1.05] tracking-tight">
            Vea un historial completo en segundos
          </h2>
          <p className="relative mt-4 max-w-[46ch] text-[1.05rem] text-bg/75">
            Elija un caso y compruebe cómo se unifican tres sistemas y cómo se detecta un examen repetido.
          </p>
          <div className="relative mt-8 flex flex-wrap gap-3">
            <Link href="/visor/90000001" className={`${btn.primary} !bg-accent`}>Abrir un caso <ArrowRight size={18} aria-hidden /></Link>
            <Link href="/visor" className={`${btn.ghost} !border-bg/30 !text-bg hover:!bg-bg/10`}>Ir al visor</Link>
          </div>
        </div>
      </Reveal>
    </>
  );
}
