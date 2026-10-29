"""Constructores de recursos FHIR R4 (subconjunto) usados por los sistemas simulados."""
from .config import CLINICA_LOCAL, DNI_SYSTEM, ICD10, LOINC, UCUM


def bundle(recursos: list[dict]) -> dict:
    return {
        "resourceType": "Bundle",
        "type": "searchset",
        "total": len(recursos),
        "entry": [{"resource": r} for r in recursos],
    }


def patient(pid: str, dni: str, nombres: str, apellidos: str, sexo: str, nacimiento: str) -> dict:
    return {
        "resourceType": "Patient",
        "id": pid,
        "identifier": [{"system": DNI_SYSTEM, "value": dni}],
        "name": [{"use": "official", "family": apellidos, "given": nombres.split()}],
        "gender": sexo,
        "birthDate": nacimiento,
    }


def _coding(codigo: str, display: str, local: bool) -> dict:
    return {"system": CLINICA_LOCAL if local else LOINC, "code": codigo, "display": display}


def observation(oid, pid, codigo, display, valor, unidad, fecha, establecimiento, local=False) -> dict:
    return {
        "resourceType": "Observation",
        "id": oid,
        "status": "final",
        "category": [{"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
            "code": "laboratory"}]}],
        "code": {"coding": [_coding(codigo, display, local)], "text": display},
        "subject": {"reference": f"Patient/{pid}"},
        "effectiveDateTime": fecha,
        "performer": [{"display": establecimiento}],
        "valueQuantity": {"value": valor, "unit": unidad, "system": UCUM, "code": unidad},
    }


def diagnostic_report(did, pid, codigo, display, conclusion, fecha, establecimiento, local=False) -> dict:
    return {
        "resourceType": "DiagnosticReport",
        "id": did,
        "status": "final",
        "code": {"coding": [_coding(codigo, display, local)], "text": display},
        "subject": {"reference": f"Patient/{pid}"},
        "effectiveDateTime": fecha,
        "performer": [{"display": establecimiento}],
        "conclusion": conclusion,
    }


def medication_statement(mid, pid, texto, fecha, establecimiento) -> dict:
    return {
        "resourceType": "MedicationStatement",
        "id": mid,
        "status": "active",
        "medicationCodeableConcept": {"text": texto},
        "subject": {"reference": f"Patient/{pid}"},
        "effectiveDateTime": fecha,
        "informationSource": {"display": establecimiento},
    }


def allergy(aid, pid, sustancia, reaccion, establecimiento) -> dict:
    return {
        "resourceType": "AllergyIntolerance",
        "id": aid,
        "clinicalStatus": {"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
            "code": "active"}]},
        "code": {"text": sustancia},
        "patient": {"reference": f"Patient/{pid}"},
        "reaction": [{"manifestation": [{"text": reaccion}], "description": reaccion}],
        "recorder": {"display": establecimiento},
    }


def condition(cid, pid, cie10, texto, establecimiento) -> dict:
    return {
        "resourceType": "Condition",
        "id": cid,
        "clinicalStatus": {"coding": [{
            "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
            "code": "active"}]},
        "code": {"coding": [{"system": ICD10, "code": cie10, "display": texto}], "text": texto},
        "subject": {"reference": f"Patient/{pid}"},
        "recorder": {"display": establecimiento},
    }
