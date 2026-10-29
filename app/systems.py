"""Tres sistemas de historia clínica simulados, cada uno con su propia API FHIR R4 (subconjunto)."""
from fastapi import APIRouter, FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse

from . import fhir
from .config import DNI_SYSTEM, SISTEMAS
from .synthetic import Store

FHIR_JSON = "application/fhir+json"


def _respuesta(cuerpo: dict, estado: int = 200) -> JSONResponse:
    return JSONResponse(cuerpo, status_code=estado, media_type=FHIR_JSON)


def _router(store: Store) -> APIRouter:
    r = APIRouter()

    def _verificar():
        if not store.en_linea:
            raise HTTPException(503, f"{SISTEMAS[store.clave]['nombre']} no está disponible")

    @r.get("/metadata")
    def metadata():
        _verificar()
        return _respuesta({
            "resourceType": "CapabilityStatement", "status": "active", "fhirVersion": "4.0.1", "kind": "instance",
            "software": {"name": SISTEMAS[store.clave]["nombre"] + " (simulado)"},
            "rest": [{"mode": "server", "resource": [
                {"type": t, "interaction": [{"code": "search-type"}]}
                for t in ["Patient", "Observation", "DiagnosticReport", "MedicationStatement",
                          "AllergyIntolerance", "Condition"]]}],
        })

    @r.get("/Patient")
    def buscar_paciente(identifier: str = Query(..., description="[sistema|]valor")):
        _verificar()
        valor = identifier.split("|")[-1]
        sistema = identifier.split("|")[0] if "|" in identifier else DNI_SYSTEM
        res = [p for p in store.pacientes.values()
               if any(i["value"] == valor and i["system"] == sistema for i in p["identifier"])]
        return _respuesta(fhir.bundle(res))

    @r.get("/Patient/{pid}")
    def leer_paciente(pid: str):
        _verificar()
        if pid not in store.pacientes:
            return _respuesta({"resourceType": "OperationOutcome", "issue": [
                {"severity": "error", "code": "not-found", "diagnostics": f"Patient/{pid}"}]}, 404)
        return _respuesta(store.pacientes[pid])

    def _buscar(tipo: str):
        def handler(patient: str = Query(...)):
            _verificar()
            return _respuesta(fhir.bundle(store.recursos.get(patient, {}).get(tipo, [])))
        return handler

    for tipo in ["Observation", "DiagnosticReport", "MedicationStatement", "AllergyIntolerance", "Condition"]:
        r.add_api_route(f"/{tipo}", _buscar(tipo), methods=["GET"])
    return r


def crear_app_sistemas(stores: dict[str, Store]) -> FastAPI:
    app = FastAPI(title="Sistemas de historia clínica simulados", docs_url=None, redoc_url=None)
    for clave, store in stores.items():
        app.include_router(_router(store), prefix=f"/{clave}/fhir")
    return app
