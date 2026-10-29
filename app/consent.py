"""Consentimiento del titular y registro de accesos (simulados en memoria)."""
from collections import defaultdict
from datetime import datetime


class Consentimientos:
    def __init__(self, iniciales: dict[str, bool]):
        self._estado = dict(iniciales)
        self._accesos: dict[str, list[dict]] = defaultdict(list)

    def conoce(self, dni: str) -> bool:
        return dni in self._estado

    def otorgado(self, dni: str) -> bool:
        return self._estado.get(dni, False)

    def fijar(self, dni: str, otorgado: bool) -> None:
        self._estado[dni] = otorgado

    def registrar(self, dni: str, quien: str, resultado: str, motivo: str) -> None:
        self._accesos[dni].append({
            "cuando": datetime.now().isoformat(timespec="seconds"),
            "quien": quien, "resultado": resultado, "motivo": motivo,
        })

    def accesos(self, dni: str) -> list[dict]:
        return list(reversed(self._accesos[dni]))
