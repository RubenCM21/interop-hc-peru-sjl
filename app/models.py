from pydantic import BaseModel


class Establecimiento(BaseModel):
    sistema: str
    nombre_sistema: str
    establecimiento: str
    id_local: str
    estado: str  # "ok" | "no_disponible"


class Examen(BaseModel):
    codigo: str | None  # LOINC; None si no se pudo normalizar
    nombre: str
    fecha: str
    resultado: str
    sistema: str
    establecimiento: str
    id_local: str


class Medicamento(BaseModel):
    nombre: str
    fuentes: list[str]


class Alergia(BaseModel):
    sustancia: str
    reaccion: str
    fuentes: list[str]


class Condicion(BaseModel):
    codigo: str
    nombre: str
    fuentes: list[str]


class AlertaDuplicado(BaseModel):
    codigo: str
    examen: str
    fecha_anterior: str
    establecimiento_anterior: str
    fecha_repeticion: str
    establecimiento_repeticion: str
    dias_transcurridos: int
    ventana_dias: int
    mensaje: str


class ResumenClinico(BaseModel):
    dni: str
    nombre: str
    sexo: str
    edad: int
    establecimientos: list[Establecimiento]
    condiciones: list[Condicion]
    alergias: list[Alergia]
    medicamentos: list[Medicamento]
    examenes: list[Examen]
    repetidos: list[AlertaDuplicado]


class ConsentimientoIn(BaseModel):
    otorgado: bool


class PedidoExamenIn(BaseModel):
    codigo: str
