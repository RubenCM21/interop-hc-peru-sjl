"""Generador determinista de pacientes ficticios repartidos entre los tres sistemas simulados.

Todos los datos son inventados. Los DNI usan el rango 90000001-90000030, que se reserva
para este prototipo. Las fechas son relativas a la fecha de referencia para que las
alertas de duplicados sigan siendo válidas el día de la demostración.
"""
import random
from datetime import date, timedelta

from . import fhir
from .config import CATALOGO_EXAMENES, LOINC_A_LOCAL, SISTEMAS

TIPOS = ["Patient", "Observation", "DiagnosticReport", "MedicationStatement", "AllergyIntolerance", "Condition"]


class Store:
    """Base de datos en memoria de un sistema simulado."""

    def __init__(self, clave: str):
        self.clave = clave
        self.en_linea = True
        self.pacientes: dict[str, dict] = {}
        self.recursos: dict[str, dict[str, list[dict]]] = {}
        self._n = 0

    def nuevo_id(self, tipo: str) -> str:
        self._n += 1
        return f"{SISTEMAS[self.clave]['prefijo']}-{tipo[:3].upper()}-{self._n:06d}"

    def agregar_paciente(self, pid: str, recurso: dict) -> None:
        self.pacientes[pid] = recurso
        self.recursos[pid] = {t: [] for t in TIPOS if t != "Patient"}

    def agregar(self, pid: str, recurso: dict) -> None:
        self.recursos[pid][recurso["resourceType"]].append(recurso)


NOMBRES_F = ["Marta", "Rosa", "Carmen", "Lucía", "Elena", "Julia", "Sofía", "Teresa", "Gladys", "Mirian"]
NOMBRES_M = ["Luis", "Jorge", "Pedro", "Carlos", "Miguel", "Raúl", "Víctor", "Hugo", "César", "Julio"]
APELLIDOS = ["Quispe", "Huamán", "Chávez", "Mendoza", "Flores", "Rojas", "Torres", "Ramos", "Vega", "Salas",
             "Paredes", "Delgado", "Condori", "Mamani", "Castillo", "Rivera", "Cruz", "Gutiérrez", "Alva", "Soto"]

CONDICIONES = {
    "hta": ("I10", "Hipertensión esencial", "Losartán 50 mg c/24 h", ["11524-6", "2160-0", "2093-3"]),
    "dm2": ("E11", "Diabetes mellitus tipo 2", "Metformina 850 mg c/12 h", ["2345-7", "4548-4", "2571-8"]),
    "ecv": ("E78", "Dislipidemia", "Atorvastatina 20 mg c/24 h", ["2093-3", "2571-8"]),
    "anemia": ("D50", "Anemia por deficiencia de hierro", "Sulfato ferroso 300 mg c/24 h", ["718-7"]),
    "resp": ("J45", "Asma", "Salbutamol inhalador a demanda", ["36643-5"]),
    "abd": ("K29", "Gastritis", "Omeprazol 20 mg c/24 h", ["24558-9"]),
}
ALERGIAS = [("Aspirina", "Urticaria"), ("Penicilina", "Erupción cutánea"), ("Sulfas", "Prurito"), ("Ibuprofeno", "Rinitis")]

# Pacientes con historia armada a propósito para la demostración.
CURADOS = [
    {   # diabética atendida en Minsa y EsSalud: repite HbA1c y glucosa
        "dni": "90000001", "nombres": "Marta", "apellidos": "Quispe Ramos", "sexo": "female", "nacimiento": "1968-03-14",
        "consentimiento": True, "sistemas": ["minsa", "essalud"],
        "condiciones": [("E11", "Diabetes mellitus tipo 2"), ("I10", "Hipertensión esencial")],
        "alergias": [("minsa", "Penicilina", "Erupción cutánea")],
        "medicamentos": [("minsa", "Metformina 850 mg c/12 h"), ("essalud", "Metformina 850 mg c/12 h"),
                         ("essalud", "Enalapril 10 mg c/24 h")],
        "examenes": [("4548-4", 12, "essalud"), ("4548-4", 55, "minsa"), ("2345-7", 8, "essalud"),
                     ("2345-7", 20, "minsa"), ("2571-8", 70, "minsa")],
    },
    {   # hipertenso en Minsa y clínica: repite ECG; la alergia solo está en el Minsa
        "dni": "90000002", "nombres": "Luis", "apellidos": "Huamán Torres", "sexo": "male", "nacimiento": "1975-09-02",
        "consentimiento": True, "sistemas": ["minsa", "clinica"],
        "condiciones": [("I10", "Hipertensión esencial")],
        "alergias": [("minsa", "Aspirina", "Urticaria")],
        "medicamentos": [("minsa", "Losartán 50 mg c/24 h"), ("clinica", "Losartán 50 mg c/24 h")],
        "examenes": [("11524-6", 9, "clinica"), ("11524-6", 21, "minsa"), ("2160-0", 15, "minsa")],
    },
    {   # referencia del Minsa a EsSalud: repite radiografía y hemoglobina
        "dni": "90000003", "nombres": "Rosa", "apellidos": "Chávez Delgado", "sexo": "female", "nacimiento": "1982-11-27",
        "consentimiento": True, "sistemas": ["minsa", "essalud"],
        "condiciones": [("J45", "Asma"), ("D50", "Anemia por deficiencia de hierro")],
        "alergias": [("essalud", "Sulfas", "Prurito")],
        "medicamentos": [("minsa", "Salbutamol inhalador a demanda"), ("essalud", "Sulfato ferroso 300 mg c/24 h")],
        "examenes": [("36643-5", 4, "essalud"), ("36643-5", 18, "minsa"), ("718-7", 6, "essalud"), ("718-7", 25, "minsa")],
    },
    {   # caso de control: un solo sistema y sin duplicados
        "dni": "90000004", "nombres": "Jorge", "apellidos": "Mendoza Paredes", "sexo": "male", "nacimiento": "1990-05-19",
        "consentimiento": True, "sistemas": ["minsa"],
        "condiciones": [("K29", "Gastritis")],
        "alergias": [],
        "medicamentos": [("minsa", "Omeprazol 20 mg c/24 h")],
        "examenes": [("2345-7", 40, "minsa"), ("2093-3", 100, "minsa")],
    },
    {   # tres sistemas y sin autorización previa del paciente
        "dni": "90000005", "nombres": "Carmen", "apellidos": "Flores Salas", "sexo": "female", "nacimiento": "1959-01-30",
        "consentimiento": False, "sistemas": ["minsa", "essalud", "clinica"],
        "condiciones": [("E11", "Diabetes mellitus tipo 2"), ("E78", "Dislipidemia")],
        "alergias": [("clinica", "Ibuprofeno", "Rinitis")],
        "medicamentos": [("minsa", "Metformina 850 mg c/12 h"), ("essalud", "Atorvastatina 20 mg c/24 h"),
                         ("clinica", "Metformina 850 mg c/12 h")],
        "examenes": [("2093-3", 16, "clinica"), ("2093-3", 48, "minsa"), ("2571-8", 10, "essalud"),
                     ("4548-4", 33, "minsa"), ("24558-9", 28, "essalud")],
    },
    {   # clínica con códigos locales: el mismo examen llega con otro código
        "dni": "90000006", "nombres": "Pedro", "apellidos": "Rojas Vega", "sexo": "male", "nacimiento": "1971-07-08",
        "consentimiento": True, "sistemas": ["essalud", "clinica"],
        "condiciones": [("E11", "Diabetes mellitus tipo 2")],
        "alergias": [],
        "medicamentos": [("essalud", "Metformina 850 mg c/12 h"), ("clinica", "Metformina 1000 mg c/12 h")],
        "examenes": [("4548-4", 14, "clinica"), ("4548-4", 40, "essalud"), ("2571-8", 30, "essalud"),
                     ("24558-9", 22, "clinica"), ("24558-9", 60, "essalud")],
    },
]

_RESULTADOS_TEXTO = {
    "11524-6": ["Ritmo sinusal, sin alteraciones agudas", "Ritmo sinusal, signos de hipertrofia ventricular izquierda"],
    "36643-5": ["Campos pulmonares sin infiltrados", "Hallazgos inespecíficos, sin consolidación"],
    "24558-9": ["Hígado de tamaño normal, sin litiasis", "Esteatosis hepática leve"],
}
_RANGOS = {"2345-7": (75, 190, "mg/dL"), "4548-4": (5.2, 9.5, "%"), "718-7": (9.5, 15.5, "g/dL"),
           "2160-0": (0.6, 1.5, "mg/dL"), "2093-3": (150, 260, "mg/dL"), "2571-8": (90, 280, "mg/dL")}


def _agregar_examen(store: Store, pid: str, codigo: str, dias: int, ref: date, rng: random.Random) -> None:
    nombre, _, _ = CATALOGO_EXAMENES[codigo]
    fecha = (ref - timedelta(days=dias)).isoformat()
    est = SISTEMAS[store.clave]["establecimiento"]
    local = store.clave == "clinica"
    cod = LOINC_A_LOCAL[codigo] if local else codigo
    oid = store.nuevo_id("Observation")
    if codigo in _RANGOS:
        bajo, alto, unidad = _RANGOS[codigo]
        valor = round(rng.uniform(bajo, alto), 1)
        store.agregar(pid, fhir.observation(oid, pid, cod, nombre, valor, unidad, fecha, est, local))
    else:
        concl = rng.choice(_RESULTADOS_TEXTO[codigo])
        store.agregar(pid, fhir.diagnostic_report(store.nuevo_id("DiagnosticReport"), pid, cod, nombre, concl, fecha, est, local))


def _cargar_paciente(stores: dict[str, Store], spec: dict, ref: date, rng: random.Random) -> None:
    locales: dict[str, str] = {}
    for clave in spec["sistemas"]:
        st = stores[clave]
        pid = f"{SISTEMAS[clave]['prefijo']}-PAC-{rng.randint(10000, 99999)}"
        locales[clave] = pid
        st.agregar_paciente(pid, fhir.patient(pid, spec["dni"], spec["nombres"], spec["apellidos"],
                                              spec["sexo"], spec["nacimiento"]))
        est = SISTEMAS[clave]["establecimiento"]
        for cie, texto in spec["condiciones"]:
            if clave == spec["sistemas"][0]:
                st.agregar(pid, fhir.condition(st.nuevo_id("Condition"), pid, cie, texto, est))
    for clave, sust, reac in spec["alergias"]:
        st = stores[clave]
        st.agregar(locales[clave], fhir.allergy(st.nuevo_id("AllergyIntolerance"), locales[clave], sust, reac,
                                                SISTEMAS[clave]["establecimiento"]))
    for clave, texto in spec["medicamentos"]:
        st = stores[clave]
        fecha = (ref - timedelta(days=rng.randint(10, 120))).isoformat()
        st.agregar(locales[clave], fhir.medication_statement(st.nuevo_id("MedicationStatement"), locales[clave],
                                                             texto, fecha, SISTEMAS[clave]["establecimiento"]))
    for codigo, dias, clave in spec["examenes"]:
        _agregar_examen(stores[clave], locales[clave], codigo, dias, ref, rng)


def _paciente_aleatorio(i: int, rng: random.Random) -> dict:
    sexo = rng.choice(["female", "male"])
    nombre = rng.choice(NOMBRES_F if sexo == "female" else NOMBRES_M)
    claves = list(SISTEMAS)
    sistemas = rng.sample(claves, rng.choice([1, 2, 2, 3]))
    cond_keys = rng.sample(list(CONDICIONES), rng.choice([1, 2]))
    condiciones = [(CONDICIONES[k][0], CONDICIONES[k][1]) for k in cond_keys]
    medicamentos = [(rng.choice(sistemas), CONDICIONES[k][2]) for k in cond_keys]
    alergias = []
    if rng.random() < 0.4:
        sust, reac = rng.choice(ALERGIAS)
        alergias.append((rng.choice(sistemas), sust, reac))
    codigos = sorted({c for k in cond_keys for c in CONDICIONES[k][3]})
    examenes = []
    for codigo in codigos:
        ventana = CATALOGO_EXAMENES[codigo][1]
        sist = rng.choice(sistemas)
        dias = rng.randint(3, 120)
        examenes.append((codigo, dias, sist))
        otros = [s for s in sistemas if s != sist]
        if otros and rng.random() < 0.45:
            examenes.append((codigo, min(120, dias + rng.randint(3, max(4, int(ventana * 0.7)))), rng.choice(otros)))
    return {
        "dni": f"{90000007 + i}", "nombres": nombre,
        "apellidos": f"{rng.choice(APELLIDOS)} {rng.choice(APELLIDOS)}", "sexo": sexo,
        "nacimiento": f"{rng.randint(1948, 2003)}-{rng.randint(1, 12):02d}-{rng.randint(1, 28):02d}",
        "consentimiento": True, "sistemas": sistemas, "condiciones": condiciones,
        "alergias": alergias, "medicamentos": medicamentos, "examenes": examenes,
    }


def construir_dataset(ref: date | None = None, semilla: int = 2026, total: int = 24):
    """Devuelve (stores, demo) donde demo describe a los pacientes para el selector de la interfaz."""
    ref = ref or date.today()
    rng = random.Random(semilla)
    stores = {clave: Store(clave) for clave in SISTEMAS}
    specs = list(CURADOS) + [_paciente_aleatorio(i, rng) for i in range(total - len(CURADOS))]
    demo = []
    for spec in specs:
        _cargar_paciente(stores, spec, ref, rng)
        demo.append({
            "dni": spec["dni"], "nombre": f"{spec['nombres']} {spec['apellidos']}",
            "sistemas": spec["sistemas"], "consentimiento": spec["consentimiento"],
        })
    return stores, demo
