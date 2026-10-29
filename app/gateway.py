"""Capa de interoperabilidad: consulta cada sistema por HTTP/FHIR, normaliza y unifica el historial."""
import asyncio
from datetime import date

import httpx
from fastapi import FastAPI

from .alerts import examenes_repetidos
from .config import CATALOGO_EXAMENES, CLINICA_LOCAL, DNI_SYSTEM, LOCAL_A_LOINC, LOINC, SISTEMAS
from .models import (Alergia, Condicion, Establecimiento, Examen, Medicamento, ResumenClinico)

TIPOS = ["Observation", "DiagnosticReport", "MedicationStatement", "AllergyIntolerance", "Condition"]


class PacienteNoEncontrado(Exception):
    def __init__(self, sistemas_caidos: list[str]):
        self.sistemas_caidos = sistemas_caidos
        super().__init__("Paciente no encontrado")


def codigo_loinc(code: dict) -> str | None:
    """Traduce el código del recurso a LOINC (los códigos locales de la clínica se mapean)."""
    for c in code.get("coding", []):
        if c.get("system") == LOINC:
            return c["code"]
        if c.get("system") == CLINICA_LOCAL and c["code"] in LOCAL_A_LOINC:
            return LOCAL_A_LOINC[c["code"]]
    return None


def _edad(nacimiento: str, hoy: date) -> int:
    n = date.fromisoformat(nacimiento)
    return hoy.year - n.year - ((hoy.month, hoy.day) < (n.month, n.day))


def _a_examen(recurso: dict, clave: str, id_local: str) -> Examen:
    codigo = codigo_loinc(recurso["code"])
    nombre = CATALOGO_EXAMENES[codigo][0] if codigo in CATALOGO_EXAMENES else recurso["code"].get("text", "Examen")
    if recurso["resourceType"] == "Observation":
        vq = recurso["valueQuantity"]
        resultado = f"{vq['value']} {vq['unit']}"
    else:
        resultado = recurso.get("conclusion", "")
    return Examen(codigo=codigo, nombre=nombre, fecha=recurso["effectiveDateTime"][:10], resultado=resultado,
                  sistema=clave, establecimiento=SISTEMAS[clave]["establecimiento"], id_local=recurso["id"])


class Gateway:
    def __init__(self, app_sistemas: FastAPI, hoy: date):
        self.hoy = hoy
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=app_sistemas),
                                        base_url="http://sistemas", timeout=5.0)

    async def _get(self, clave: str, ruta: str, **params) -> dict:
        r = await self.client.get(f"/{clave}/fhir/{ruta}", params=params)
        r.raise_for_status()
        return r.json()

    async def _consultar(self, clave: str, dni: str):
        try:
            b = await self._get(clave, "Patient", identifier=f"{DNI_SYSTEM}|{dni}")
            entradas = b.get("entry", [])
            if not entradas:
                return clave, None, "ok"
            paciente = entradas[0]["resource"]
            bundles = await asyncio.gather(*[self._get(clave, t, patient=paciente["id"]) for t in TIPOS])
        except httpx.HTTPError:
            return clave, None, "no_disponible"
        recursos = {t: [e["resource"] for e in b.get("entry", [])] for t, b in zip(TIPOS, bundles)}
        return clave, {"paciente": paciente, "recursos": recursos}, "ok"

    async def resumen(self, dni: str) -> ResumenClinico:
        resultados = await asyncio.gather(*[self._consultar(c, dni) for c in SISTEMAS])
        encontrados = {c: d for c, d, _ in resultados if d}
        caidos = [c for c, d, estado in resultados if estado == "no_disponible"]
        if not encontrados:
            raise PacienteNoEncontrado(caidos)

        establecimientos: list[Establecimiento] = []
        for clave, datos, estado in resultados:
            if datos or estado == "no_disponible":
                establecimientos.append(Establecimiento(
                    sistema=clave, nombre_sistema=SISTEMAS[clave]["nombre"],
                    establecimiento=SISTEMAS[clave]["establecimiento"],
                    id_local=datos["paciente"]["id"] if datos else "—", estado=estado))

        base = next(iter(encontrados.values()))["paciente"]
        nombre = " ".join(base["name"][0]["given"]) + " " + base["name"][0]["family"]

        examenes: list[Examen] = []
        meds: dict[str, Medicamento] = {}
        alergias: dict[str, Alergia] = {}
        condiciones: dict[str, Condicion] = {}
        for clave, datos in encontrados.items():
            est = SISTEMAS[clave]["establecimiento"]
            r = datos["recursos"]
            for recurso in r["Observation"] + r["DiagnosticReport"]:
                examenes.append(_a_examen(recurso, clave, recurso["id"]))
            for m in r["MedicationStatement"]:
                texto = m["medicationCodeableConcept"]["text"]
                meds.setdefault(texto.lower(), Medicamento(nombre=texto, fuentes=[])).fuentes.append(est)
            for a in r["AllergyIntolerance"]:
                sust = a["code"]["text"]
                alergias.setdefault(sust.lower(), Alergia(
                    sustancia=sust, reaccion=a["reaction"][0]["description"], fuentes=[])).fuentes.append(est)
            for c in r["Condition"]:
                cod = c["code"]["coding"][0]["code"]
                condiciones.setdefault(cod, Condicion(
                    codigo=cod, nombre=c["code"]["text"], fuentes=[])).fuentes.append(est)
        examenes.sort(key=lambda e: e.fecha, reverse=True)

        return ResumenClinico(
            dni=dni, nombre=nombre, sexo=base["gender"], edad=_edad(base["birthDate"], self.hoy),
            establecimientos=establecimientos, condiciones=list(condiciones.values()),
            alergias=list(alergias.values()), medicamentos=list(meds.values()),
            examenes=examenes, repetidos=examenes_repetidos(examenes))
