"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Moon, Sun } from "@phosphor-icons/react";
import { contenedor } from "./ui";

const enlaces = [
  { href: "/", texto: "Inicio" },
  { href: "/ingresar", texto: "Acceder" },
];

function BotonTema() {
  const [oscuro, setOscuro] = useState(false);
  useEffect(() => {
    const t = document.documentElement.dataset.theme;
    setOscuro(t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  const alternar = () => {
    const siguiente = oscuro ? "light" : "dark";
    document.documentElement.dataset.theme = siguiente;
    try { localStorage.setItem("tema", siguiente); } catch { /* ignorar */ }
    setOscuro(!oscuro);
  };
  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={oscuro ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="inline-grid size-11 place-items-center rounded-ctl text-muted transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {oscuro ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}

export function SiteHeader() {
  const ruta = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-bg">
      <div className={`${contenedor} flex min-h-16 items-center justify-between gap-4`}>
        <Link href="/" className="whitespace-nowrap font-mono text-[0.95rem] font-medium tracking-tight text-ink no-underline">
          interop<span className="text-accent-strong">-hc-</span>peru
        </Link>
        <nav aria-label="Principal" className="flex items-center gap-1">
          {enlaces.map((l) => {
            const activo = l.href === "/" ? ruta === "/" : ruta.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={activo ? "page" : undefined}
                className={`whitespace-nowrap rounded-ctl px-3.5 py-2 text-[0.95rem] font-medium no-underline transition-colors hover:bg-surface-2 hover:text-ink ${activo ? "bg-surface-2 text-ink" : "text-muted"}`}
              >
                {l.texto}
              </Link>
            );
          })}
          <BotonTema />
        </nav>
      </div>
    </header>
  );
}
