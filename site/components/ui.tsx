import Link from "next/link";
import { SISTEMAS, type Clave } from "@/lib/data";

export const fecha = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
export const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
export const ms = (n: number) => `${Math.round(n)} ms`;

const COLOR: Record<Clave, string> = {
  minsa: "text-minsa border-minsa/30 bg-minsa/10",
  essalud: "text-essalud border-essalud/30 bg-essalud/10",
  clinica: "text-clinica border-clinica/30 bg-clinica/10",
};

export function Chip({ clave, children }: { clave: Clave; children?: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[0.8rem] font-medium leading-[1.4] ${COLOR[clave]}`}>
      {children ?? SISTEMAS[clave].corto}
    </span>
  );
}

const BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-ctl border border-transparent px-5 py-2.5 text-[0.95rem] font-semibold transition-[transform,background-color,border-color] duration-200 active:scale-[0.985] active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";
export const btn = {
  primary: `${BASE} bg-accent text-accent-ink hover:bg-[color-mix(in_srgb,var(--accent)_88%,var(--ink))]`,
  secondary: `${BASE} bg-surface-2 text-ink hover:bg-[color-mix(in_srgb,var(--surface-2)_80%,var(--ink))]`,
  ghost: `${BASE} border-line bg-transparent text-ink hover:bg-surface-2`,
  sm: "!min-h-10 !px-3.5 !py-1.5 !text-[0.88rem]",
};

export function BotonLink({ href, variante = "primary", pequeno, children }: {
  href: string; variante?: keyof typeof btn; pequeno?: boolean; children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`${btn[variante]} ${pequeno ? btn.sm : ""}`}>
      {children}
    </Link>
  );
}

export const panel = "rounded-card border border-line bg-surface p-5 shadow-card sm:p-6";
export const contenedor = "mx-auto w-[min(100%-3rem,1360px)]";
