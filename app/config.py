"""Constantes del prototipo: sistemas simulados, catálogo de exámenes y mapeo de códigos locales."""

DNI_SYSTEM = "https://www.reniec.gob.pe/dni"  # URI de ejemplo para el prototipo
LOINC = "http://loinc.org"
ICD10 = "http://hl7.org/fhir/sid/icd-10"
UCUM = "http://unitsofmeasure.org"
CLINICA_LOCAL = "urn:clinica-san-camilo:codigos-locales"

SISTEMAS = {
    "minsa": {
        "nombre": "Minsa · SIHCE",
        "establecimiento": "C.S. Villa Esperanza (Minsa)",
        "prefijo": "SIHCE",
    },
    "essalud": {
        "nombre": "EsSalud · ESSI",
        "establecimiento": "Policlínico Los Olivos (EsSalud)",
        "prefijo": "ESSI",
    },
    "clinica": {
        "nombre": "Clínica privada",
        "establecimiento": "Clínica San Camilo (privada)",
        "prefijo": "CLX",
    },
}

# código LOINC -> (nombre, ventana en días para considerar un examen "reciente", tipo)
# La ventana es un parámetro de demostración, no una recomendación clínica.
CATALOGO_EXAMENES = {
    "2345-7": ("Glucosa en suero", 30, "laboratorio"),
    "4548-4": ("Hemoglobina glicosilada (HbA1c)", 90, "laboratorio"),
    "718-7": ("Hemoglobina", 30, "laboratorio"),
    "2160-0": ("Creatinina en suero", 30, "laboratorio"),
    "2093-3": ("Colesterol total", 90, "laboratorio"),
    "2571-8": ("Triglicéridos", 90, "laboratorio"),
    "11524-6": ("Electrocardiograma (ECG)", 30, "gabinete"),
    "36643-5": ("Radiografía de tórax", 90, "imagen"),
    "24558-9": ("Ecografía abdominal", 90, "imagen"),
}

# La clínica privada usa códigos propios; la capa de interoperabilidad los traduce a LOINC.
LOCAL_A_LOINC = {
    "CLX-GLU": "2345-7",
    "CLX-HBA1C": "4548-4",
    "CLX-HB": "718-7",
    "CLX-CREA": "2160-0",
    "CLX-COL": "2093-3",
    "CLX-TG": "2571-8",
    "CLX-ECG": "11524-6",
    "CLX-RXTOR": "36643-5",
    "CLX-ECOABD": "24558-9",
}
LOINC_A_LOCAL = {v: k for k, v in LOCAL_A_LOINC.items()}
