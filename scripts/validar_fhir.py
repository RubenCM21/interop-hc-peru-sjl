"""Valida los recursos de los sistemas simulados contra un servidor FHIR R4 público (HAPI).

Uso:  python scripts/validar_fhir.py [--servidor https://hapi.fhir.org/baseR4] [--pacientes 6]

Cada paciente se valida como un Bundle (tipo collection) con el Patient y todos sus recursos, para que
las referencias internas se resuelvan. Solo se envían datos ficticios. Los avisos esperados
(narrativa 'dom-6' y el CodeSystem local de la clínica) se cuentan aparte.
"""
import argparse
import sys
from datetime import date
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.synthetic import construir_dataset  # noqa: E402

# HAPI público no incluye los CodeSystem de LOINC ni de CIE-10: esos códigos se verifican con
# scripts/verificar_loinc.py (servidor de terminología). El resto de avisos sí se reportan.
ESPERADOS = ("dom-6", "urn:clinica-san-camilo:codigos-locales", "http://loinc.org",
             "http://hl7.org/fhir/sid/icd-10", "Unable to expand ValueSet because CodeSystem")


def bundle_de(clave: str, paciente: dict, recursos: dict) -> dict:
    base = f"http://sistemas.local/{clave}/fhir/"
    todos = [paciente] + [r for lista in recursos.values() for r in lista]
    return {"resourceType": "Bundle", "type": "collection",
            "entry": [{"fullUrl": f"{base}{r['resourceType']}/{r['id']}", "resource": r} for r in todos]}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--servidor", default="https://hapi.fhir.org/baseR4")
    ap.add_argument("--pacientes", type=int, default=6, help="pacientes por sistema a validar")
    args = ap.parse_args()

    stores, _ = construir_dataset(date.today())
    errores = avisos = esperados = recursos_ok = 0
    for clave, store in stores.items():
        for pid in list(store.pacientes)[: args.pacientes]:
            b = bundle_de(clave, store.pacientes[pid], store.recursos[pid])
            r = httpx.post(f"{args.servidor}/Bundle/$validate", json=b, timeout=90,
                           headers={"Content-Type": "application/fhir+json", "Accept": "application/fhir+json"})
            r.raise_for_status()
            for issue in r.json().get("issue", []):
                texto = issue.get("diagnostics") or issue.get("details", {}).get("text", "")
                if issue["severity"] in ("error", "fatal"):
                    errores += 1
                    print(f"ERROR [{clave}/{pid}] {texto}")
                elif any(e in texto for e in ESPERADOS):
                    esperados += 1
                else:
                    avisos += 1
                    print(f"AVISO [{clave}/{pid}] {texto[:160]}")
            recursos_ok += len(b["entry"])
    print(f"\nRecursos validados: {recursos_ok} · errores: {errores} · avisos: {avisos} · avisos esperados: {esperados}")
    return 1 if errores else 0


if __name__ == "__main__":
    raise SystemExit(main())
