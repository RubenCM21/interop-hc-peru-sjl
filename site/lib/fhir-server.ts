// API FHIR simulada de los tres sistemas. La usan el Route Handler (servidor) y,
// si no hay red, la pasarela del navegador como respaldo.
import { DNI_SYSTEM, SISTEMAS, construirDataset, type Clave } from "./data";

export interface Bundle {
  resourceType: "Bundle";
  type: "searchset";
  total: number;
  entry: { resource: any }[];
}

export class ErrorHttp extends Error {
  constructor(public estado: number, mensaje: string) {
    super(mensaje);
  }
}

const dataset = construirDataset();
export const stores = dataset.stores;
export const PACIENTES = dataset.pacientes as {
  dni: string; nombre: string; sistemas: Clave[]; consentimiento: boolean; titulo?: string; muestra?: string;
}[];

export const esClave = (v: string): v is Clave => v in SISTEMAS;
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
const entre = ([a, b]: [number, number]) => a + Math.random() * (b - a);

export async function consultaFhir(
  clave: Clave,
  tipo: string,
  params: Record<string, string>,
  caido = false,
): Promise<Bundle> {
  const st = stores[clave];
  await espera(entre(SISTEMAS[clave].latencia));
  if (caido) throw new ErrorHttp(503, `${SISTEMAS[clave].nombre} no está disponible`);
  let resultado: any[] = [];
  if (tipo === "Patient") {
    const id = params.identifier ?? "";
    const [sistema, valor] = id.includes("|") ? id.split("|") : [DNI_SYSTEM, id];
    resultado = [...st.pacientes.values()].filter((p: any) =>
      p.identifier.some((i: any) => i.value === valor && i.system === sistema),
    );
  } else {
    resultado = st.recursos.get(params.patient)?.[tipo] ?? [];
  }
  return { resourceType: "Bundle", type: "searchset", total: resultado.length, entry: resultado.map((resource) => ({ resource })) };
}
