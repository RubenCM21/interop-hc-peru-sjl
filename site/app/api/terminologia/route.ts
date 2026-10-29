import { NextResponse, type NextRequest } from "next/server";
import { CATALOGO } from "@/lib/data";

// GET /api/terminologia?codigos=2093-3,718-7
// Consulta el servicio de terminología de HL7 (tx.fhir.org) para obtener el nombre oficial de cada
// código LOINC. Solo acepta códigos del catálogo del visor, de modo que no funciona como proxy abierto.
const TX = "https://tx.fhir.org/r4/CodeSystem/$lookup";

async function nombreOficial(codigo: string): Promise<{ display: string; version: string | null } | null> {
  try {
    const url = `${TX}?system=${encodeURIComponent("http://loinc.org")}&code=${encodeURIComponent(codigo)}&_format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const p = (await res.json()) as { parameter?: { name: string; valueString?: string }[] };
    const valor = (n: string) => p.parameter?.find((x) => x.name === n)?.valueString;
    const display = valor("display");
    return display ? { display, version: valor("version") ?? null } : null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const pedidos = (req.nextUrl.searchParams.get("codigos") ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => c in CATALOGO);
  const codigos = [...new Set(pedidos)].slice(0, 20);
  const respuestas = await Promise.all(codigos.map(async (c) => [c, await nombreOficial(c)] as const));
  const items: Record<string, string> = {};
  let version: string | null = null;
  for (const [c, r] of respuestas) {
    if (r) { items[c] = r.display; version ??= r.version; }
  }
  return NextResponse.json(
    { fuente: "tx.fhir.org", version, items },
    { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
  );
}
