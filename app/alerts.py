"""Detección de exámenes duplicados entre establecimientos."""
from datetime import date

from .config import CATALOGO_EXAMENES
from .models import AlertaDuplicado, Examen


def _fecha(texto: str) -> date:
    return date.fromisoformat(texto[:10])


def examenes_repetidos(examenes: list[Examen]) -> list[AlertaDuplicado]:
    """Pares del mismo examen hechos en sistemas distintos dentro de la ventana de cada examen."""
    por_codigo: dict[str, list[Examen]] = {}
    for e in examenes:
        if e.codigo in CATALOGO_EXAMENES:
            por_codigo.setdefault(e.codigo, []).append(e)
    alertas: list[AlertaDuplicado] = []
    for codigo, lista in por_codigo.items():
        nombre, ventana, _ = CATALOGO_EXAMENES[codigo]
        lista.sort(key=lambda e: e.fecha)
        for anterior, posterior in zip(lista, lista[1:]):
            if anterior.sistema == posterior.sistema:
                continue
            dias = (_fecha(posterior.fecha) - _fecha(anterior.fecha)).days
            if dias <= ventana:
                alertas.append(AlertaDuplicado(
                    codigo=codigo, examen=nombre,
                    fecha_anterior=anterior.fecha, establecimiento_anterior=anterior.establecimiento,
                    fecha_repeticion=posterior.fecha, establecimiento_repeticion=posterior.establecimiento,
                    dias_transcurridos=dias, ventana_dias=ventana,
                    mensaje=(f"{nombre}: se repitió en {posterior.establecimiento} {dias} días después de "
                             f"{anterior.establecimiento} (ventana de {ventana} días)."),
                ))
    return sorted(alertas, key=lambda a: a.fecha_repeticion, reverse=True)


def evaluar_pedido(examenes: list[Examen], codigo: str, hoy: date) -> dict:
    """Antes de pedir un examen: ¿ya existe uno reciente en cualquier establecimiento?"""
    if codigo not in CATALOGO_EXAMENES:
        raise KeyError(codigo)
    nombre, ventana, _ = CATALOGO_EXAMENES[codigo]
    previos = sorted((e for e in examenes if e.codigo == codigo), key=lambda e: e.fecha, reverse=True)
    if not previos:
        return {"duplicado": False, "examen": nombre, "ventana_dias": ventana, "previo": None,
                "dias": None, "mensaje": f"No hay registros previos de {nombre}. Se puede pedir."}
    ultimo = previos[0]
    dias = (hoy - _fecha(ultimo.fecha)).days
    if dias <= ventana:
        return {"duplicado": True, "examen": nombre, "ventana_dias": ventana, "previo": ultimo.model_dump(),
                "dias": dias,
                "mensaje": (f"Posible duplicado: {nombre} se hizo hace {dias} días en {ultimo.establecimiento} "
                            f"(resultado: {ultimo.resultado}).")}
    return {"duplicado": False, "examen": nombre, "ventana_dias": ventana, "previo": ultimo.model_dump(),
            "dias": dias,
            "mensaje": (f"El último {nombre} fue hace {dias} días en {ultimo.establecimiento}, fuera de la "
                        f"ventana de {ventana} días. Se puede pedir.")}
