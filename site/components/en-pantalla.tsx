"use client";

import { useEffect, useRef, useState } from "react";

// Marca el bloque con data-vista="true" solo mientras es visible. El CSS usa esa marca para
// animar únicamente lo que se ve, así nada corre fuera de pantalla.
export function EnPantalla({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vista, setVista] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVista(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} data-vista={vista} className={className}>
      {children}
    </div>
  );
}
