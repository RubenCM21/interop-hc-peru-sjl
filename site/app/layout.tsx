import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Historia clínica unificada | interop-hc-peru", template: "%s | interop-hc-peru" },
  description:
    "Visor de resumen del paciente sobre FHIR que une Minsa, EsSalud y clínicas por DNI y avisa antes de repetir un examen.",
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f6f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1520" },
  ],
};

const aplicarTema = `try{var t=localStorage.getItem("tema");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: aplicarTema }} />
      </head>
      <body className="min-h-dvh flex flex-col font-sans antialiased">
        <a
          href="#principal"
          className="absolute -top-16 left-4 z-[100] rounded-ctl bg-ink px-4 py-2 text-bg focus:top-4"
        >
          Saltar al contenido
        </a>
        <SiteHeader />
        <main id="principal" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
