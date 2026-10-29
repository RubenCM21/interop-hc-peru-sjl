"use client";

import { useEffect, useRef } from "react";

// Monitor de electrocardiograma decorativo (no es una señal clínica). Un punto barre de izquierda a
// derecha escribiendo la onda en tiempo real: sube y baja con cada latido y deja una estela que se
// desvanece. Se pausa fuera de pantalla y, con movimiento reducido, dibuja el trazo quieto.
const ANCHO_LATIDO = 246; // px por latido
const VELOCIDAD = 280; // px por segundo (~68 latidos por minuto)
const COLA = 460; // largo de la estela, en px
const P = [6, 7, 5, 7];
const R = [44, 56, 40, 64];
const T = [14, 18, 12, 20];

// Vértices (u, desplazamiento) de un latido; negativo es hacia arriba. Cada uno de los cuatro latidos varía.
const LATIDOS: [number, number][][] = R.map((r, i) => {
  const v: [number, number][] = [[0, 0], [60, 0], [66, -P[i]], [74, 0], [98, 0], [104, 8], [114, 8 - r], [124, 16], [130, 0], [160, 0]];
  for (let s = 1; s <= 8; s++) { const q = s / 8; v.push([160 + 28 * q, -2 * T[i] * q * (1 - q)]); }
  v.push([ANCHO_LATIDO, 0]);
  return v;
});

function desplazamiento(xt: number) {
  const k = Math.floor(xt / ANCHO_LATIDO);
  const u = xt - k * ANCHO_LATIDO;
  const v = LATIDOS[((k % 4) + 4) % 4];
  let j = 1;
  while (j < v.length - 1 && v[j][0] < u) j++;
  const [u0, y0] = v[j - 1], [u1, y1] = v[j];
  const y = y0 + ((y1 - y0) * (u - u0)) / (u1 - u0 || 1);
  return y + Math.sin(xt / 170) * 1.6; // ligera deriva de la línea base
}

export function EcgVivo({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const reducido = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, ys = new Float32Array(0), xTotal = 0, ultimo = 0, raf = 0, visible = false, color = "#0a7c77", cuadros = 0;

    const base = () => H * 0.62;
    const muestra = (xt: number) => base() + desplazamiento(xt);
    const leerColor = () => { color = getComputedStyle(cv).getPropertyValue("--accent").trim() || color; };

    const preparar = () => {
      const r = cv.getBoundingClientRect();
      W = Math.max(1, Math.floor(r.width));
      H = Math.max(1, Math.floor(r.height));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ys = new Float32Array(W);
      for (let x = 0; x < W; x++) ys[x] = muestra(x);
      xTotal = 0;
      leerColor();
      if (reducido) estatico();
    };

    const estatico = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = color; ctx.globalAlpha = 0.45; ctx.lineWidth = 2; ctx.lineJoin = "round";
      ctx.beginPath();
      for (let x = 0; x < W; x++) (x ? ctx.lineTo(x, ys[x]) : ctx.moveTo(x, ys[x]));
      ctx.stroke(); ctx.globalAlpha = 1;
    };

    const dibujar = () => {
      ctx.clearRect(0, 0, W, H);
      const cabeza = Math.floor(xTotal) % W;
      const largo = Math.min(COLA, Math.floor(W * 0.55));
      const paso = 6;
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
      for (let i = 0; i < largo; i += paso) {
        ctx.globalAlpha = Math.pow((i + paso) / largo, 1.7) * 0.95;
        ctx.beginPath();
        let prev = -1;
        for (let j = i; j <= Math.min(i + paso, largo); j++) {
          const idx = (cabeza - largo + j + W * 2) % W;
          if (prev === -1 || idx < prev) ctx.moveTo(idx, ys[idx]); else ctx.lineTo(idx, ys[idx]);
          prev = idx;
        }
        ctx.stroke();
      }
      const y = ys[cabeza];
      ctx.globalAlpha = 0.2; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cabeza, y, 8, 0, 6.2832); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(cabeza, y, 3, 0, 6.2832); ctx.fill();
    };

    const cuadro = (t: number) => {
      raf = requestAnimationFrame(cuadro);
      const dt = Math.min(0.05, (t - ultimo) / 1000);
      ultimo = t;
      const previo = Math.floor(xTotal);
      xTotal += VELOCIDAD * dt;
      for (let x = previo + 1; x <= Math.floor(xTotal); x++) ys[x % W] = muestra(x);
      if (++cuadros % 45 === 0) leerColor();
      dibujar();
    };

    const alternar = () => {
      const debe = visible && !document.hidden && !reducido;
      if (debe && !raf) { ultimo = performance.now(); raf = requestAnimationFrame(cuadro); }
      else if (!debe && raf) { cancelAnimationFrame(raf); raf = 0; }
    };

    preparar();
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; alternar(); }, { rootMargin: "60px" });
    io.observe(cv);
    const ro = new ResizeObserver(() => preparar());
    ro.observe(cv);
    document.addEventListener("visibilitychange", alternar);
    return () => {
      io.disconnect(); ro.disconnect();
      document.removeEventListener("visibilitychange", alternar);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
