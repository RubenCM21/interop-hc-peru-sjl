# Interoperabilidad clínica — SJL: cambios aplicados al ZIP

**Alcance:** Primera entrega funcional de datos sintéticos y visor clínico por atención.
No se trata de una integración oficial con RENHICE, MINSA, EsSalud, SISOL, clínicas ni Colegio Médico del Perú.

## Qué cambió

- `site/lib/establecimientos-sjl.ts`: 32 nombres de establecimientos de SJL aportados por el equipo. Algunos aparecen en directorios del MINSA; los demás se conservan como referencias pendientes de validar en RENIPRESS. Se agrupan por red Minsa, EsSalud, municipal y privada. **No son conexiones reales.**
- `site/lib/catalogo-clinico.ts`: 21 exámenes con unidades, muestra, fuentes y referencias orientativas. Incluye glucosa, HbA1c, hemoglobina, hematocrito, leucocitos, plaquetas, creatinina, BUN, sodio, potasio, colesterol, triglicéridos, HDL, LDL calculado, ALT, AST, bilirrubina total, TSH, ECG, radiografía de tórax y ecografía abdominal. No incluye los reportes complejos completos (p.ej. antibiogramas, imágenes DICOM, paneles de hemograma) todavía.
- `site/lib/data.ts`: 24 pacientes ficticios, atenciones `Encounter` FHIR R4 con fecha, hora, profesional ficticio, sede SJL, síntomas, signos vitales, evaluación y plan *sintéticos*; resultados `Observation`/`DiagnosticReport` enlazados a su atención; `MedicationStatement` asociado a consulta, fecha de inicio y fin cuando se documenta.
- `site/lib/gateway.ts`: centraliza las atenciones por paciente, conserva procedencia específica de cada examen y suspende el respaldo silencioso cuando fallan las API; la caída se reporta como fuente no disponible.
- `site/components/visor/historial.tsx`: historial expandible por atención, filtros por período (7, 30, 90, 180, 365 días y completo), establecimiento, tipo de examen y texto, resultados con referencias clínicas y directorio referencial de SJL.
- `site/components/visor/resultado.tsx`: enlaza las nuevas secciones, mejora advertencias sobre coincidencias de exámenes y distingue medicamentos activos/finalizados según información ficticia registrada.
- `site/app/page.tsx` y `site/components/visor/visor.tsx`: destacan que se trata de un prototipo académico SJL y que todas las fuentes son simuladas.

## Ejecutar en Windows

1. Descomprimir el ZIP.
2. Abrir terminal en `interop-hc-peru-main/site`.
3. Instalar Node.js 22 LTS o superior compatible con Next.js 16.
4. Ejecutar `npm install` (requiere Internet para instalar dependencias).
5. Ejecutar `npm run dev`.
6. Abrir `http://localhost:3000/visor` y consultar por ejemplo `90000001`.
7. Para verificar datos generados: `npm run test:sjl`.

## Verificación realizada

- Dataset construido: 24 pacientes, 113 atenciones, 144 exámenes y 32 sedes referenciales; todas las pruebas sintéticas se enlazan a una atención.
- Integración con gateway simulado y bloqueo del caso sin autorización de demostración: correcto.
- 11 pruebas Python existentes: correctas.
- Los archivos TS/TSX modificados pasan el análisis de sintaxis, pero **no se pudo ejecutar un build de Next.js en este entorno** porque la instalación de dependencias no llegó a completarse. Se debe validar `npm run build` tras `npm install` en Windows.

## Importante: NO es aún una plataforma lista para producción

- El visor **no dispone todavía de login real**, portal de paciente, verificación CMP, autorización institucional, consentimiento seguro en servidor ni base de datos persistente; la autorización previa sigue siendo una simulación en navegador.
- Las rutas `site/app/api/fhir/` siguen abiertas en la aplicación de demostración. NO subir esta versión a Internet con datos reales ni interpretarla como un control seguro de acceso.
- Los DNI 90000001–90000024 son identificadores de DEMOSTRACIÓN. Los nombres de médicos, resultados, diagnósticos, indicaciones, dosis y signos vitales son inventados.
- No se debe atribuir a los establecimientos reales ningún profesional, examen, paciente, especialidad ni disponibilidad.
- Las referencias generales **no reemplazan** los intervalos de referencia definidos por el laboratorio que emite cada informe; el significado depende del método, edad, sexo, embarazo y condiciones clínicas. Un resultado no establece por sí solo una enfermedad.
- Las alertas de exámenes similares son orientativas; pueden ser necesarios estudios repetidos por motivos clínicos.

## Siguiente etapa (pendiente)

1. Login para médicos y pacientes con sesiones seguras y un backend de autorización. Verificación CMP e institucional mediante mecanismos autorizados; consultar un CMP público **no** autoriza a acceder a expedientes.
2. Consentimientos guardados y auditados en PostgreSQL, segregación estricta por rol y custodia de datos.
3. Informes auténticamente estructurados por orden de laboratorio (múltiples analitos), documentos PDF de demostración, microbiología, informes de imagen y recetas independientes con seguimiento de dispensación.
4. Validación integral de perfiles peruanos IPS/COREPE y terminologías LOINC/UCUM antes de cualquier intercambio oficial.

## Fuentes públicas de referencia

- Minsa — lista de establecimientos de primer nivel: https://www.gob.pe/16727-conocer-establecimientos-de-salud-del-primer-nivel-de-atencion
- Minsa — C.S. Campoy, RD 976-2025: https://www.gob.pe/institucion/dirislimacentro/normas-legales/7320285-976-2025-dg-diris-lc
- MINSA/DIGESA — directorio histórico SJL (actualizar con RENIPRESS): https://www.digesa.minsa.gob.pe/Orientacion/San_Juan_de_Lurigancho.pdf
- ADA — Standards of Care 2026, criterios de diabetes: https://diabetesjournals.org/care/article/49/Supplement_1/S27/163926/2-Diagnosis-and-Classification-of-Diab
- MedlinePlus — colesterol: https://medlineplus.gov/spanish/pruebas-de-laboratorio/niveles-de-colesterol/
- MedlinePlus — triglicéridos: https://medlineplus.gov/spanish/pruebas-de-laboratorio/prueba-de-trigliceridos/
- MedlinePlus — interpretación de resultados y variación de referencias: https://medlineplus.gov/spanish/pruebas-de-laboratorio/como-entender-sus-resultados-de-pruebas-de-laboratorio/
- FHIR R4 — Encounter: https://hl7.org/fhir/R4/encounter.html
- FHIR R4 — DiagnosticReport: https://hl7.org/fhir/R4/diagnosticreport.html
