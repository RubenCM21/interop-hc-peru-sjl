import type { Alerta } from "@/lib/gateway";

export const mensajeAlerta = (a: Alerta) =>
  `${a.examen}: se repitió en ${a.lugarRepeticion} ${a.dias} días después de ${a.lugarAnterior} (ventana de ${a.ventana} días).`;

export const sexo = (s: string) => (s === "female" ? "Mujer" : "Hombre");
