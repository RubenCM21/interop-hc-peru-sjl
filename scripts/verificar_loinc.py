"""Verifica los códigos LOINC del catálogo contra un servidor de terminología FHIR (tx.fhir.org)."""
import sys
from pathlib import Path

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.config import CATALOGO_EXAMENES  # noqa: E402

SERVIDOR = "https://tx.fhir.org/r4"


def main() -> int:
    fallos = 0
    for codigo, (nombre, _, _) in CATALOGO_EXAMENES.items():
        r = httpx.get(f"{SERVIDOR}/CodeSystem/$lookup", timeout=30,
                      params={"system": "http://loinc.org", "code": codigo},
                      headers={"Accept": "application/fhir+json"})
        if r.status_code != 200:
            fallos += 1
            print(f"FALLA {codigo} ({nombre}): http {r.status_code}")
            continue
        display = next(p["valueString"] for p in r.json()["parameter"] if p["name"] == "display")
        print(f"OK    {codigo}  {display}  <- {nombre}")
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())
