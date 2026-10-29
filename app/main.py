"""API del visor de historia clínica unificada (PMV1).

Arquitectura:  navegador -> /api (gateway de interoperabilidad) -> /sistemas/{minsa|essalud|clinica}/fhir
"""
import re
from datetime import date
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .alerts import evaluar_pedido
from .config import CATALOGO_EXAMENES, SISTEMAS
from .consent import Consentimientos
from .gateway import Gateway, PacienteNoEncontrado
from .models import ConsentimientoIn, PedidoExamenIn, ResumenClinico
from .synthetic import construir_dataset
from .systems import crear_app_sistemas

STATIC = Path(__file__).parent / "static"


class EstadoIn(BaseModel):
    en_linea: bool


def crear_app(hoy: date | None = None) -> FastAPI:
    hoy = hoy or date.today()
    stores, demo = construir_dataset(hoy)
    sistemas = crear_app_sistemas(stores)
    gateway = Gateway(sistemas, hoy)
    consentimientos = Consentimientos({d["dni"]: d["consentimiento"] for d in demo})

    app = FastAPI(title="interop-hc-peru · PMV1", version="0.1.0",
                  description="Visor de historia clínica unificada con datos sintéticos.")
    app.mount("/sistemas", sistemas)

    def _dni(dni: str) -> str:
        if not re.fullmatch(r"\d{8}", dni):
            raise HTTPException(422, "El DNI debe tener 8 dígitos.")
        if not consentimientos.conoce(dni):
            raise HTTPException(404, "No se encontró un paciente con ese DNI en los sistemas conectados.")
        return dni

    async def _resumen_autorizado(dni: str, medico: str, motivo: str) -> ResumenClinico:
        _dni(dni)
        if not consentimientos.otorgado(dni):
            consentimientos.registrar(dni, medico, "denegado", motivo)
            raise HTTPException(403, {"codigo": "sin_consentimiento",
                                      "mensaje": "El paciente no ha autorizado el acceso a su historial."})
        try:
            resumen = await gateway.resumen(dni)
        except PacienteNoEncontrado as e:
            msg = "No se encontró un paciente con ese DNI en los sistemas conectados."
            if e.sistemas_caidos:
                msg += " Hay sistemas no disponibles: " + ", ".join(SISTEMAS[c]["nombre"] for c in e.sistemas_caidos) + "."
            raise HTTPException(404, msg)
        consentimientos.registrar(dni, medico, "permitido", motivo)
        return resumen

    @app.get("/api/salud")
    def salud():
        return {"sistemas": [{"clave": c, "nombre": s["nombre"], "establecimiento": s["establecimiento"],
                              "en_linea": stores[c].en_linea} for c, s in SISTEMAS.items()]}

    @app.post("/api/demo/sistemas/{clave}/estado")
    def estado_sistema(clave: str, cuerpo: EstadoIn):
        if clave not in stores:
            raise HTTPException(404, "Sistema desconocido")
        stores[clave].en_linea = cuerpo.en_linea
        return salud()

    @app.get("/api/demo/pacientes")
    def pacientes_demo():
        return [{**d, "consentimiento": consentimientos.otorgado(d["dni"])} for d in demo]

    @app.get("/api/examenes/catalogo")
    def catalogo():
        return [{"codigo": c, "nombre": n, "ventana_dias": v, "tipo": t} for c, (n, v, t) in CATALOGO_EXAMENES.items()]

    @app.get("/api/pacientes/{dni}/resumen", response_model=ResumenClinico)
    async def resumen(dni: str, medico: str = "Médico demo"):
        return await _resumen_autorizado(dni, medico, "consulta de historial")

    @app.post("/api/pacientes/{dni}/consentimiento")
    def consentimiento(dni: str, cuerpo: ConsentimientoIn):
        _dni(dni)
        consentimientos.fijar(dni, cuerpo.otorgado)
        consentimientos.registrar(dni, "Paciente (simulado)", "consentimiento",
                                  "otorgado" if cuerpo.otorgado else "revocado")
        return {"dni": dni, "otorgado": cuerpo.otorgado}

    @app.get("/api/pacientes/{dni}/accesos")
    def accesos(dni: str):
        _dni(dni)
        return consentimientos.accesos(dni)

    @app.post("/api/pacientes/{dni}/pedido-examen")
    async def pedido_examen(dni: str, cuerpo: PedidoExamenIn, medico: str = "Médico demo"):
        if cuerpo.codigo not in CATALOGO_EXAMENES:
            raise HTTPException(422, "Examen fuera del catálogo del prototipo.")
        r = await _resumen_autorizado(dni, medico, f"pedido de examen {cuerpo.codigo}")
        return evaluar_pedido(r.examenes, cuerpo.codigo, hoy)

    app.mount("/", StaticFiles(directory=STATIC, html=True), name="static")
    return app


app = crear_app()
