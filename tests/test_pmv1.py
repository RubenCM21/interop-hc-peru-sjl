from datetime import date

import pytest
from fastapi.testclient import TestClient

from app.main import crear_app

HOY = date(2026, 10, 28)


@pytest.fixture()
def client():
    return TestClient(crear_app(HOY))


def test_unifica_paciente_con_ids_locales_distintos(client):
    r = client.get("/api/pacientes/90000001/resumen")
    assert r.status_code == 200
    datos = r.json()
    assert {e["sistema"] for e in datos["establecimientos"]} == {"minsa", "essalud"}
    ids = {e["id_local"] for e in datos["establecimientos"]}
    assert len(ids) == 2  # el mismo paciente tiene un ID distinto en cada sistema
    assert datos["nombre"] == "Marta Quispe Ramos"


def test_detecta_examenes_repetidos_entre_establecimientos(client):
    datos = client.get("/api/pacientes/90000001/resumen").json()
    repetidos = {a["codigo"] for a in datos["repetidos"]}
    assert {"4548-4", "2345-7"} <= repetidos


def test_normaliza_codigos_locales_de_la_clinica(client):
    datos = client.get("/api/pacientes/90000006/resumen").json()
    de_clinica = [e for e in datos["examenes"] if e["sistema"] == "clinica"]
    assert de_clinica and all(e["codigo"] for e in de_clinica)
    assert any(e["codigo"] == "4548-4" for e in de_clinica)


def test_unifica_alergias_y_medicamentos(client):
    datos = client.get("/api/pacientes/90000002/resumen").json()
    assert [a["sustancia"] for a in datos["alergias"]] == ["Aspirina"]  # solo registrada en el Minsa
    losartan = [m for m in datos["medicamentos"] if m["nombre"].startswith("Losartán")]
    assert len(losartan) == 1 and len(losartan[0]["fuentes"]) == 2


def test_sin_consentimiento_bloquea_y_se_puede_autorizar(client):
    r = client.get("/api/pacientes/90000005/resumen")
    assert r.status_code == 403
    assert r.json()["detail"]["codigo"] == "sin_consentimiento"
    assert client.post("/api/pacientes/90000005/consentimiento", json={"otorgado": True}).status_code == 200
    r = client.get("/api/pacientes/90000005/resumen")
    assert r.status_code == 200
    assert len(r.json()["establecimientos"]) == 3
    resultados = [a["resultado"] for a in client.get("/api/pacientes/90000005/accesos").json()]
    assert "denegado" in resultados and "permitido" in resultados


def test_pedido_de_examen_alerta_duplicado(client):
    r = client.post("/api/pacientes/90000002/pedido-examen", json={"codigo": "11524-6"})
    assert r.status_code == 200
    cuerpo = r.json()
    assert cuerpo["duplicado"] is True and cuerpo["dias"] == 9


def test_pedido_de_examen_sin_antecedentes_no_alerta(client):
    r = client.post("/api/pacientes/90000004/pedido-examen", json={"codigo": "11524-6"})
    assert r.status_code == 200 and r.json()["duplicado"] is False


def test_paciente_de_control_no_tiene_repetidos(client):
    assert client.get("/api/pacientes/90000004/resumen").json()["repetidos"] == []


def test_sistema_caido_no_rompe_la_consulta(client):
    client.post("/api/demo/sistemas/minsa/estado", json={"en_linea": False})
    datos = client.get("/api/pacientes/90000001/resumen").json()
    estados = {e["sistema"]: e["estado"] for e in datos["establecimientos"]}
    assert estados == {"minsa": "no_disponible", "essalud": "ok"}
    assert all(e["sistema"] == "essalud" for e in datos["examenes"])


def test_dni_invalido_y_desconocido(client):
    assert client.get("/api/pacientes/123/resumen").status_code == 422
    assert client.get("/api/pacientes/11111111/resumen").status_code == 404


def test_los_sistemas_exponen_fhir_directamente(client):
    r = client.get("/sistemas/minsa/fhir/Patient", params={"identifier": "https://www.reniec.gob.pe/dni|90000001"})
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("application/fhir+json")
    assert r.json()["total"] == 1
    assert client.get("/sistemas/essalud/fhir/metadata").json()["fhirVersion"] == "4.0.1"
