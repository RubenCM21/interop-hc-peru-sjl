# PLAN MAESTRO DE IMPLEMENTACIÓN — VISOR CLÍNICO INTEROPERABLE PERÚ

**Proyecto académico:** TE111U Innovación y Gestión Tecnológica · UNI-FIIS · Grupo C  
**Propuesta seleccionada:** Visor de resumen del paciente mediante identificación, autorización y estándares FHIR  
**Versión del documento:** 2.0 · 28 de octubre de 2026 (ampliada con dos portales, CMP y atención longitudinal)  
**Estado:** propuesta técnica y funcional, no certificación ni implementación productiva.

> **Restricción esencial:** todos los pacientes, registros médicos, resultados y cuentas de demostración serán **sintéticos**. No utilizar expedientes reales, copias de informes identificables ni conexiones a RENHICE, Minsa o EsSalud sin autorización. Los nombres de tipos de establecimientos sirven para la simulación; su inclusión no afirma una integración institucional.

## 0. Resumen ejecutivo y decisiones de producto

**Problema:** las historias clínicas de establecimientos distintos no siempre son accesibles de forma interoperable; ello puede obligar a reconstruir antecedentes o repetir estudios. El grupo entrevistó a cuatro usuarios que habían trasladado sus resultados y repetido pruebas.

**Valor:** proporcionar al profesional **autorizado** una vista clínica resumida, trazable y ordenada por prioridad; ofrecer al paciente control y visibilidad; demostrar cómo intercambiar información normalizada entre sistemas diferentes.

**Principios innegociables:**
1. DNI u otro documento = **identificador**, nunca prueba suficiente de identidad ni permiso de lectura.
2. Verificación conjunta: sesión autenticada + rol + relación asistencial/finalidad + autorización aplicable + control por recurso.
3. Resumen IPS **no equivale** a expediente médico íntegro. Debe comunicarse cobertura, actualidad, fuentes ausentes e incertidumbre.
4. Datos sin registro ≠ resultado negativo ≠ ausencia de condición. Diferenciar explícitamente «No registrado», «Negado por paciente», «Desconocido» y «Fuente no disponible».
5. No diagnosticar automáticamente ni impedir exámenes con reglas fijas. Una coincidencia es una invitación a revisar, no una prohibición.
6. Preservar fuente, fecha, estado, método, unidades, identificación y versiones originales de cada resultado.
7. Los accesos clínicos no ocurren en el navegador directamente contra endpoints públicos. Los autoriza el servidor.
8. Se diseñará una experiencia profesional y comprensible, sin decoración que compita con los datos clínicos.
9. Seguridad y accesibilidad se diseñan desde el comienzo, no como complementos al final.
10. El MVP solo usa datos ficticios verosímiles; una producción real requeriría acuerdos y evaluación jurídica, sanitaria y de ciberseguridad.

**Alcance inmediato:** un sitio Next.js unificado, backend protegido, PostgreSQL, tres simuladores independientes, exactamente dos portales de usuarios finales (médico y paciente), autorización demostrativa, informes PDF sintéticos, alertas explicables, auditoría y pruebas. **Fuera de alcance inmediato:** conexión a RENHICE, importación de datos reales, prescripción clínica real, integración RENIEC, visualizador DICOM profesional, sistema integral de laboratorio (LIS), telemedicina, firma digital institucional válida o certificación ministerial.

## 1. Diagnóstico verificable del repositorio original

Archivos revisados del ZIP `interop-hc-peru-main.zip`:

- `site/`: Next.js 16.4.3, React 19.3, TypeScript, interfaz principal.
- `site/lib/data.ts`: dataset determinista de 24 personas sintéticas; seis casos dirigidos y otros generados. `// @ts-nocheck` desactiva comprobación de tipos en este archivo.
- `site/lib/gateway.ts`: consulta FHIR desde navegador, transforma recursos, genera alertas y guarda autorización/bitácora en `localStorage`; también ofrece respaldo desde dataset importado al cliente cuando falla la red.
- `site/lib/fhir-server.ts`: simulador de consulta FHIR en el mismo proyecto.
- `site/app/api/fhir/[sistema]/[tipo]/route.ts`: ruta HTTP de datos sintéticos sin autenticación real.
- `site/components/visor/visor.tsx`: búsqueda con DNI incrustado en `/visor/[dni]`.
- `site/components/visor/resultado.tsx`: cabecera, alergias, lista plana de exámenes, medicamentos, condiciones, duplicados y accesos demostrativos.
- `app/`: FastAPI alternativa con funciones equivalentes; `web/`: versión estática alternativa. `tests/` contiene pruebas Python, **no cobertura integral de la interfaz Next.js**.

**Brechas principales:** falta login real, segmentación por perfil, identidad y permisos del paciente, registros persistentes, informes de laboratorio detallados, estudios de imágenes estructurados, consultas médicas longitudinales, estándares IPS/COREPE validados, estados clínicos y datos de calidad, auditoría inalterable, escenarios de errores completos, seguridad de endpoints, pruebas de integración frontend/backend.

**Correcciones obligatorias antes de publicar con datos de cualquier clase:** retirar el fallback que presenta memoria local como consulta FHIR en vivo; impedir acceso no autenticado; no guardar autorización clínica en `localStorage`; excluir documentos de URLs y registros; tipar formalmente recursos y datos; ocultar en producción los controles para provocar caída de sistemas y la lista pública de pacientes.

## 2. Alcance por perfiles y matriz de permisos

| Actor | Buscar pacientes | Leer resumen | Leer resultado completo | Autorizar acceso | Editar datos clínicos | Administración | Auditoría |
|---|---|---|---|---|---|---|---|
| Paciente | Solo identidad propia | Propio | Propio | Propio / representante habilitado | No, solo solicitar corrección | Preferencias propias | Sus propios accesos |
| Médico tratante | Con contexto asistencial | Solo autorizado | Según finalidad y alcance | Solicitar, no autoaprobar | No en fuentes externas; notas de simulación separadas | No | Solo eventos propios pertinentes |
| Enfermería | Paciente asignado | Subconjunto autorizado | Según funciones | Solicitar cuando corresponda | Solo ámbitos permitidos de simulación | No | Operaciones propias |
| Laboratorio | Orden de trabajo asignada | Mínimo indispensable | Resultados de su laboratorio | No en nombre del paciente | Emitir/corregir informe sintético con trazabilidad | No | Su actividad |
| Administrador institucional | Identificadores necesarios | No por defecto | No por defecto | No | No | Usuarios y roles | Métricas, no contenido |
| Auditor de seguridad | Identificadores minimizados | No por defecto | No por defecto | No | No | No | Eventos necesarios |
| Administrador TI | Identificadores técnicos | No por defecto | No por defecto | No | No | Infraestructura e integraciones | Eventos técnicos sanitizados |

El **MVP principal** implementará completamente paciente y médico; los demás perfiles pueden limitarse a vistas de gestión demostrativas. Las políticas se aplican **en servidor** y no únicamente ocultando elementos de interfaz. No crear un «superadministrador» que vea todos los datos clínicos por comodidad.

### Identificación y titularidad
- Documento: DNI (8 caracteres numéricos), carné de extranjería y otros identificadores futuros, cada uno con sistema, tipo, país y fuente.
- No fiarse de la coincidencia simple en nombre o número si hay discrepancias; mantener IDs internos y un identificador maestro sintético.
- Personas con DNI duplicado o registros incompatibles: detener unificación, mostrar «identidad pendiente de verificación» y generar una tarea de conciliación.
- Pacientes menores, representantes legales, fallecidos, emergencia y medidas de apoyo: definir flujos separados sujetos a política institucional y revisión legal; **no inventar autorizaciones**.
- Nunca exponer nombre, edad, sexo ni existencia de la persona a quien no haya superado las verificaciones iniciales.

## 3. Flujos de usuario completos

### 3.1 Médico — atención habitual
1. Abrir aplicación por HTTPS y autenticarse con cuenta institucional de demostración, idealmente MFA.
2. Ver panel «Mis atenciones» con establecimiento y rol activos; evitar lista global de pacientes.
3. Pulsar «Buscar paciente», introducir documento, tipo y finalidad de acceso («Atención en curso», «Seguimiento», etc.).
4. Confirmar identidad con datos adicionales aportados por flujo clínico autorizado; si hay conflicto, no abrir resumen.
5. Ver estado de **autorización**: vigente, solicitada, pendiente, denegada, revocada o excepción documentada.
6. Cuando corresponde, generar una solicitud con alcance, persona/establecimiento solicitante, finalidad y vencimiento.
7. El paciente autoriza desde su portal autenticado o mediante código de un solo uso derivado de un canal previamente verificado; el simple DNI no autoriza.
8. El servidor valida cada condición y registra el evento. Solo entonces consulta a los sistemas simulados.
9. Mostrar resumen clínico, fuente/actualidad, resultados y advertencias de información faltante.
10. Permitir abrir informe original, comparar medidas, revisar posible duplicidad y registrar la decisión clínica **en la simulación**, sin alterar resultados originales.
11. Finalizar atención o cerrar sesión; impedir que se pueda consultar el expediente por el botón Atrás tras cerrar sesión.

### 3.2 Paciente — acceso propio
1. Entrar al «Portal del paciente» y autenticar identidad con credenciales previamente provisionadas. El DNI por sí solo no activa cuentas.
2. Ver el resumen personal **solo si está disponible en fuentes simuladas** y su alcance; explicar que no cubre todos los establecimientos del Perú.
3. Consultar resultados, atenciones, medicación y autorizaciones vigentes.
4. Revisar solicitudes: nombre/rol/establecimiento del solicitante, razón, datos pedidos, duración, política de revocación.
5. Aprobar o rechazar, recibir confirmación, consultar trazabilidad y revocar accesos futuros cuando aplique.
6. Solicitar corrección de datos discordantes; la solicitud no debe borrar ni reescribir la fuente original.
7. Descargar un **resumen sintético** marcado como demostración; recordar que no reemplaza la documentación de atención médica.

### 3.3 Excepción de emergencia («break glass»)
Solo como **flujo documental o simulación**, no como permiso general: motivo clínico tipificado, identificación inequívoca del profesional y establecimiento, alcance mínimo, acceso temporal, motivo obligatorio, bitácora reforzada y revisión posterior. El encaje jurídico y el manejo de información clínica especialmente protegida requieren validación normativa específica antes de un piloto real.

### 3.4 Otros caminos obligatorios
- Persona sin registros en ninguna fuente; fuente caída; autorización expirada; permisos insuficientes.
- Dos pacientes distintos con DNI conflictivo; coincidencia de documento y diferencias de nombre/fecha de nacimiento.
- Paciente que rechaza, revoca o aprueba parcialmente una solicitud.
- Paciente representado legalmente; persona sin teléfono o sin conectividad; titular indisponible.
- Médico pierde conexión durante consulta; cambio de establecimiento o de rol; sesión vencida.
- Resultado preliminar luego corregido; informe anulado; resultados de laboratorio contradictorios.
- Datos sensibles con protección especial; auditoría de accesos impropios; alertas clínicas descartadas con motivo.


## 3A. REDEFINICIÓN APROBADA: DOS PORTALES Y EXPEDIENTE CENTRADO EN ATENCIONES (V2.0)

> **Decisión del equipo:** las **únicas personas usuarias finales del MVP** serán (1) **médico** y (2) **paciente**. Puede existir una consola interna mínima para provisionar cuentas ficticias, asignar profesionales a establecimientos, revisar bitácoras y gestionar el entorno, pero no será un tercer portal clínico. Enfermería, laboratorio y otros perfiles se reservan como potenciales extensiones, sin prometer su funcionamiento ahora.

### 3A.1 Acceso de médicos: colegiatura CMP, habilitación, vinculación y permiso por paciente

**Registro/alta del médico — campos:** `professional_id` interno; nombres y apellidos; documento de identidad; número de CMP; especialidad declarada (opcional y verificable); correo institucional o corporativo confirmado; contraseña; factor adicional; establecimiento e identificador de IPRESS simulado; rol clínico; estado del proceso de verificación; constancia/código de verificación si procede; fecha de última comprobación; quién verificó; estado de cuenta y condiciones de suspensión.

**Estados de registro:** borrador → identidad/correo por verificar → CMP por verificar → habilitación por comprobar → vínculo institucional por aprobar → aprobado → suspendido/rechazado. Cada transición tiene responsable, motivo y auditoría. Nunca permitir que el médico se autoasigne el estado «verificado» o cambie su IPRESS sin control.

**Fuente oficial:** el portal del CMP enlaza «Conoce a tu Médico», donde puede comprobarse colegiatura, estado de habilidad y especialidades. La información pública **no equivale a un servicio API oficialmente autorizado** para plataformas de terceros. Para la demo, usar cuentas ficticias y un servicio `ProfessionalRegistryAdapter` con respuesta simulada y los campos `cmp_number`, `match_name`, `is_registered`, `is_enabled`, `specialties`, `verified_at`, `verification_method`, `verification_source` y `status`; separar claramente «verificación simulada» de consulta real. En un piloto auténtico sería necesario acordar el mecanismo de acceso legal y técnico con CMP/institución, registrar fuente y política de revalidación, y evaluar anomalías (inhabilitación, sanciones, cambios de nombres o especialidad).

**Distinción obligatoria de permisos:**
1. `identidad`: ¿es la persona que afirma ser?
2. `profesion`: ¿es médico colegiado y actualmente habilitado para las funciones relevantes?
3. `afiliacion`: ¿pertenece al establecimiento desde el cual opera?
4. `relacion_asistencial`: ¿existe una atención/derivación o finalidad legítima y registrada?
5. `autorizacion_paciente`: ¿existe un permiso aplicable, válido, con alcance y plazo definidos, o un supuesto legal excepcional validado?
6. `session`: ¿continúan vigentes autenticación, MFA y sesión sin riesgo elevado?

Solo si las seis validaciones relevantes tienen un estado compatible, el servidor autoriza datos clínicos. Ser médico habilitado **no significa** permiso global para ver historias clínicas. Si vence la habilitación o el vínculo institucional, suspender nuevas consultas clínicas hasta la revisión correspondiente; la regla real depende de la política que apruebe cada entidad.

**Login:** correo profesional verificado + contraseña + segundo factor; mostrar CMP y nombre en la interfaz tras iniciar sesión. Recuperación de acceso con canal verificado, control de intentos y revocación de sesiones. **No usar número CMP como secreto** ni contraseña única compartida entre médicos.

### 3A.2 Acceso de pacientes: DNI + correo + contraseña, con acreditación de identidad

**Registro/alta:** DNI como identificador, nombres y apellidos, fecha de nacimiento para conciliación, correo individual verificado, contraseña segura, segundo factor según riesgo, aceptación de información de privacidad, estado de acreditación de identidad, fecha de verificación y mecanismos de recuperación.

**Operativa elegida:** el registro de la demo se realiza sobre un DNI sintético ya asociado a un paciente previamente provisionado. La persona debe tener acceso a un canal verificado por la plataforma; el correo y el conocimiento del DNI no prueban la titularidad legal del documento. No se simulará una validación real contra RENIEC si no existe integración legítima. Un tercero no podrá crear una cuenta con el DNI de otro y acceder a su expediente.

**Login posterior:** permitir DNI **o** correo verificado como identificador + contraseña; sesiones seguras, segundo factor cuando corresponda y cierre remoto. Tras autenticarse, la cuenta está limitada a `patient_uuid` propio o a relaciones de representación acreditadas y limitadas. No hay buscador público de otros pacientes.

**Inicio del portal paciente:** «Mi resumen»; «Mis atenciones»; «Mis exámenes»; «Mis tratamientos»; «Alergias y antecedentes»; «Autorizaciones»; «Quién consultó mi historia»; «Mi cuenta/seguridad»; ayuda. Mismo contenido clínico básico que el visor profesional, pero lenguaje menos técnico y explicaciones de términos; no mostrar afirmaciones diagnósticas automáticas.

### 3A.3 Principio clínico nuclear: cada atención es un episodio documentado

La base del historial **NO será** una tabla plana de diagnósticos, laboratorios o medicamentos sin contexto. La unidad principal es la **atención** `Encounter` de FHIR R4, enlazada con todas las observaciones, decisiones y documentos producidos en ella. Se diferencian: **atención individual** (visita o ingreso); **episodio longitudinal** (`EpisodeOfCare` u agrupador interno, p. ej., control de diabetes a lo largo de meses); y **resumen global derivado** (vista actual de problemas, alergias y tratamientos de todas las fuentes). Una hospitalización puede contener varias atenciones o eventos subordinados; no asumir que una fecha equivale a una sola acción clínica.

#### Campos para la cabecera de cada atención

| Grupo | Campos requeridos y comportamiento |
|---|---|
| Identidad del evento | `encounter_id`, ID en fuente, número de atención si existe, tipo (consulta externa, emergencia, hospitalización, teleconsulta, control), estado y versión |
| Cronología | Inicio **fecha y hora** y término si existe; zona horaria de origen; fecha de registro y de última modificación separadas |
| Prestador | Red y establecimiento/IPRESS ficticio, servicio, especialidad, consultorio/área, modalidad presencial/remota |
| Responsables | Nombre del médico, CMP ficticio, especialidad y rol en esa atención; participantes adicionales cuando existan; profesional que firma/valida |
| Motivo | Motivo de consulta expresado por el paciente, derivación, problema o seguimiento; motivo de llegada a emergencia cuando corresponda |
| Anamnesis | Síntomas, comienzo, evolución, duración y contexto; antecedentes pertinentes; medicación declarada, alergias referidas |
| Evaluación | Signos vitales, hallazgos de exploración física, evaluación clínica; solo si el sistema fuente los documenta |
| Diagnóstico | Presuntivo/definitivo/diferencial si procede, código y literal original, fecha, estado de certeza documentado, profesional y fuente |
| Exámenes | Solicitudes `ServiceRequest`, muestras `Specimen`, resultados `DiagnosticReport`/`Observation` y sus estados; se permiten resultados posteriores a la fecha de consulta |
| Procedimientos | Intervenciones y procedimientos realizados (`Procedure`), fecha/hora, ejecutante y resultado documentado |
| Plan terapéutico | Medicamentos prescritos, tratamiento no farmacológico, dosis, vía, frecuencia, duración, fecha de inicio/fin, instrucciones y responsable |
| Continuidad | Control sugerido, referencia/contrarreferencia, advertencias entregadas, próxima cita si existe, estado de cierre |
| Documentos | Informe/nota firmada, receta, resultados, indicaciones, PDF sintético y metadatos de fuente; estado y versión |
| Auditoría/calidad | Origen, fecha de sincronización, integridad de los vínculos, campos ausentes, correcciones, firma electrónica **solo simulada** |

**Reglas de presentación:** distinguir «No registrado» de «No presenta síntomas»; campos no aplicables no se rellenan artificialmente; no imputar diagnósticos ni duraciones. Se pueden asociar órdenes/resultados emitidos **después** de una consulta a la atención que los originó, sin falsificar la hora; mantener siempre la hora propia del informe. Una medicación continúa existiendo fuera de la atención donde se prescribió, pero conserva un enlace hacia su origen.

#### Pantalla detallada de atención (orden recomendado)

1. Encabezado: fecha/hora, institución, servicio, tipo/estado y médico con CMP de demostración, procedencia y fecha de actualización.
2. Motivo y síntomas; anamnesis/historia de la enfermedad actual.
3. Signos vitales y exploración física, presentando unidades.
4. Evaluación clínica y diagnósticos, diferenciando sospecha de confirmación.
5. Exámenes solicitados, pendientes y resultados completos (laboratorio, imágenes, documentos).
6. Tratamiento: farmacológico y no farmacológico, instrucciones, **duración conocida o no establecida**, estado derivado y seguimiento.
7. Referencia, indicaciones y próxima atención.
8. Informe/nota de atención y trazabilidad (emisor y modificaciones); nunca permitir modificar arbitrariamente el documento de otro establecimiento.

**Ejemplo sintético:** `15/10/2026 · 09:25 · Centro de salud simulado · Medicina interna · Dra. Elena Flores (CMP ficticio 000001)`. Motivo: control de enfermedad crónica. Evaluación: síntomas documentados y presión registrada. Exámenes: glucosa solicitada; resultado de laboratorio emitido `15/10/2026 · 13:10`. Diagnóstico y tratamiento vinculados a esta consulta, con plan de control ulterior. Los datos son ficticios, no una pauta médica.

### 3A.4 Vista global: el resumen no sustituye el historial completo

El médico y el paciente verán primero una **ficha general**, derivada de las atenciones, con secciones separadas:

- **Datos generales:** nombre, documento parcialmente oculto cuando proceda, fecha de nacimiento/edad, sexo registrado si es pertinente, identificador interno, información de contacto únicamente en el portal propio o cuando esté autorizada; establecimiento y fuentes consultadas.
- **Alertas de seguridad y alergias:** sustancia, reacción, gravedad/certeza documentadas, fecha y fuente; distinguir «sin alergias conocidas declaradas» de «alergias no documentadas».
- **Antecedentes personales y familiares relevantes:** condiciones crónicas, cirugías, hospitalizaciones, antecedentes familiares y hábitos solo si están documentados; fuente, período y estado.
- **Diagnósticos activos, resueltos y presuntivos:** agrupar con trazabilidad, sin inferir certeza ni cerrar automáticamente una condición crónica.
- **Tratamientos activos, finalizados, suspendidos y de estado incierto:** ver §3A.6. Mantener fuente y atención de prescripción visibles.
- **Últimas atenciones:** 3–5 tarjetas con vínculo al detalle íntegro.
- **Últimos resultados:** valor, fecha, estado, establecimiento y vista «Abrir informe».
- **Observaciones de datos:** discrepancias, fecha de actualización y fuentes no disponibles; el sistema no puede prometer una «historia completa».

**Diseño móvil:** resumen vertical con lo más importante primero; el detalle por atención se abre en tarjeta con secciones desplegables. **Diseño escritorio:** barra de paciente fija + resumen en primer nivel + cronología/expediente con navegación lateral. El paciente tendrá lenguaje contextual y explicaciones, no códigos CIE/LOINC como elemento principal.

### 3A.5 Vista «Mis atenciones» / «Historial de atenciones»: búsqueda y filtros

**Búsqueda universal contextual** en el expediente de un paciente ya autorizado: texto en motivo, diagnóstico, especialidad, institución, médico, nombre de examen, principio activo y número de atención, sin búsqueda global sobre historias de terceros.

| Filtro | Opciones |
|---|---|
| Período rápido | Últimos **7 días**, **30 días**, **90 días**, **6 meses**, **12 meses**, **Todo** |
| Fechas personalizadas | Desde/hasta, con límites y zona horaria visible; incluir períodos sin hora con precisión de día |
| Fuente | Todas; Minsa simulado; EsSalud simulado; clínica simulada |
| Establecimiento | Centro/hospital/servicio, mostrando nombre de la fuente original |
| Tipo de atención | Consulta externa; emergencia; hospitalización; control; teleconsulta |
| Especialidad/profesional | Lista por expediente; búsqueda por nombre del médico o especialidad |
| Motivo/diagnóstico | Texto y categoría; distinguir diagnóstico principal/segundario y presuntivo/definitivo |
| Estudios | Con examen; sin examen; examen pendiente; examen informado; resultado corregido |
| Tratamientos | Con receta; sin receta; con tratamiento activo que se originó allí |
| Estado/estatus de datos | Finalizado/en curso; completa/incompleta; fuentes sin conexión |
| Orden | Más reciente (predeterminado); más antigua; agrupado por año/institución |

**Contadores:** «28 atenciones encontradas de 34 documentadas» solo cuando el conteo sea confiable en las fuentes consultadas; si fuente inaccesible, decir «resultados parciales» sin sugerir un total exacto. Filtros combinables, botón «Limpiar filtros», estado vacío útil y retorno al filtro previo desde el detalle. Debe ser fácil consultar «¿Qué me hicieron en las últimas dos semanas?».

### 3A.6 Pestaña «Exámenes»: filtros clínicos y alertas temporales

Filtros independientes de la cronología de consultas: **últimos 7/15/30/90 días, 6/12 meses, rango personalizado**, centro, especialidad, prueba, grupo (laboratorio, imagen, cardiología, microbiología, patología), estado del informe, muestra, resultado fuera de referencia, documentos disponibles, pruebas relacionadas y pendientes. Evitar mezclar **fecha solicitada**, **fecha de toma**, **fecha de resultado** y **fecha de validación**; usuario puede escoger la columna temporal de filtro cuando resulte relevante.

Cada fila/tarjeta: nombre de estudio, fecha y hora principal, laboratorio/establecimiento, médico solicitante, resumen del resultado sin interpretaciones automáticas, estado (preliminar/final/corregido), procedencia, «Ver informe» y vínculo a la atención originaria. Paneles de laboratorio contienen analitos y rangos **propios del emisor**; pruebas radiológicas contienen técnica, hallazgos e impresión. Un estudio sin informe no se marcará «negativo».

**Alertas de estudios previos:** búsqueda de equivalencias verificadas por LOINC/técnica/muestra y similitud contextual, sin regla universal de ventana. Mostrar «Existe estudio reciente relacionado, consultar antes de solicitar uno nuevo», con fecha y causa de coincidencia. La decisión final pertenece al médico. Permitir registrar «revisado», «repetición justificada» o «no comparable» como acción simulada sin cambiar el documento original.

### 3A.7 Tratamientos: duración, vigencia y evidencia de uso

Un tratamiento necesita más que `medicamento + fecha`. Crear entidad **plan/tratamiento** (`treatment_plan_id`) ligada a su atención de inicio, con líneas de medicamentos y medidas no farmacológicas. Permitir cambios de dosis o suspensiones sin destruir versiones.

| Campo | Regla |
|---|---|
| Medicamento | principio activo, nombre comercial cuando conste, concentración, forma farmacéutica |
| Instrucción | dosis, unidad, vía, frecuencia, pauta y condiciones; conservar texto original |
| Período | fecha/hora de inicio indicada; duración prescrita (`7 días`, `3 meses`, `indefinida`, `no especificada`); fecha de fin **solo cuando resulte calculable y esté justificada** |
| Clasificación | **prescrito**, **dispensado**, **administrado** o **declarado como tomado**: evidencias separadas, no equivalentes |
| Estado clínico | activo reportado, programado, finalizado, suspendido, reemplazado, desconocido; fuente de verdad y última confirmación |
| Responsable | médico prescriptor, CMP ficticio, establecimiento, fecha y `encounter_id` de origen |
| Seguimiento | próxima revisión prevista; ajuste en consultas posteriores; razón de suspensión cuando exista |
| Calidad | discrepancia entre instituciones, instrucciones incompletas, fecha final desconocida, duplicidades nominales |

**Regla esencial:** no marcar automáticamente «activo» solo porque una receta de medicamento crónico no tenga fecha de fin. Mostrar **«Prescripción vigente según el registro; uso real no confirmado»**, **«Uso informado por paciente»** o **«Estado no verificado»** cuando corresponda. La vigencia de una receta, la duración del suministro y el período en que el paciente toma el fármaco son conceptos distintos en FHIR (`MedicationRequest` vs `MedicationStatement`). Tampoco se debe deducir adherencia ni inventar fechas de suspensión.

Un tratamiento puede incluir medicamentos, rehabilitación, dieta u otras medidas registradas; estas últimas no se modelarán forzadamente como `MedicationRequest`. Cada modificación será una nueva versión/orden relacionada con el plan original. Los tratamientos **pasados** se pueden consultar por año, diagnóstico, institución y prescriptor.

### 3A.8 Propuesta de navegación definitiva (dos portales)

**Portal médico**
```
Panel del médico
├── Mis atenciones / pacientes asignados
├── Buscar paciente (DNI y finalidad asistencial)
├── Solicitudes de autorización
├── Expediente del paciente (solo autorizado)
│   ├── Resumen general
│   ├── Historial de atenciones (lista cronológica + filtros)
│   │   └── Detalle de cada atención
│   │       ├── Motivo y síntomas
│   │       ├── Examen físico y signos vitales
│   │       ├── Diagnósticos
│   │       ├── Exámenes, resultados e informes
│   │       ├── Plan de tratamiento, medicamentos y duración
│   │       └── Indicaciones, referencias y seguimiento
│   ├── Exámenes globales (filtros temporales)
│   ├── Tratamientos activos y pasados
│   ├── Alergias y antecedentes
│   └── Documentos y procedencia
└── Mi perfil (CMP, institución, sesiones y seguridad)
```

**Portal paciente**
```
Mi salud
├── Mi resumen clínico
├── Mis atenciones (misma cronología; lenguaje claro)
├── Mis exámenes (búsqueda, fechas, resultados, PDFs)
├── Mis tratamientos (indicados, pasados, vigencia y dudas)
├── Alergias y antecedentes
├── Solicitudes de acceso (aprobar/rechazar)
├── Quién consultó mi historia (fecha, profesional, institución)
└── Mi perfil / privacidad / dispositivos / ayuda
```

**Principios de usabilidad:** acción más importante en primera vista, breadcrumb para regresar de resultados a atención, filtros persistentes, búsqueda simple y avanzada, tablas adaptadas a móvil, fecha/hora en zona peruana, etiquetas sin jerga y explicaciones de jerga técnica; no saturar con estadísticas o mensajes redundantes.

### 3A.9 Modelo relacional mínimo de V2 (entidades y vínculos)

```
User --(1:1)--> PatientAccount --> Patient
     \--(1:1)--> DoctorAccount --> ProfessionalCMPVerification
                               --> InstitutionMembership
Patient --(1:N)--> Encounter <--(N:1)-- Doctor
                        |--(1:N)--> EncounterSymptom
                        |--(1:N)--> VitalSignObservation
                        |--(1:N)--> EncounterDiagnosis
                        |--(1:N)--> TestOrder --> DiagnosticReport --> ResultObservation
                        |--(1:N)--> TreatmentPlan --> MedicationOrder
                        |--(1:N)--> ProcedureRecord
                        |--(1:N)--> EncounterDocument
                        \--(1:N)--> FollowUpInstruction
Patient --(1:N)--> AllergyRecord / BackgroundCondition
Patient --(1:N)--> AccessRequest --> Authorization --> AuditEvent
SourceSystem / Organization --> Encounter / Report / MedicationOrder
```

**Tablas adicionales o ajustes al esquema original:** `doctor_accounts`, `cmp_verification_events`, `institution_memberships`, `patient_accounts`, `encounters`, `encounter_participants`, `encounter_symptoms`, `vital_sign_observations`, `encounter_diagnoses`, `test_orders`, `report_encounter_links`, `treatment_plans`, `medication_orders`, `medication_use_statements`, `treatment_changes`, `follow_up_instructions`, `encounter_documents`, `clinical_notes`, `clinical_note_versions`, `data_provenance`. Las tablas derivadas de lectura nunca pierden referencia al recurso fuente.

**Restricciones:** `patient_uuid` UUID aleatorio; `encounter_uuid` aleatorio; ID de origen por establecimiento; integridad de claves; `patient_uuid` consistente entre todos los recursos vinculados; versión inmutable con historial de correcciones; hora UTC + precisión de origen + visualización America/Lima; fuentes separadas; validación de no cruces de identidad. La historia clínica fuente permanece en su sistema, el visor presenta copias normalizadas autorizadas; cachés expirables y permisos al leer.

### 3A.10 API V2 propuesta (además de endpoints del plan original)

```
POST /api/doctor/onboarding               # solicitud de cuenta (sin autoaprobación)
GET  /api/doctor/profile                  # nombre, CMP, verificación, membresías
GET  /api/doctor/verification-status      # estado de verificación/inhabilitación demo
POST /api/patient/register                # DNI sintético preprovisionado; desafío verificado
GET  /api/me/profile
GET  /api/patients/{opaqueId}/encounters?from=&to=&source=&type=&q=
GET  /api/patients/{opaqueId}/encounters/{encounterId}
GET  /api/patients/{opaqueId}/tests?dateType=performed&from=&to=&category=&status=
GET  /api/patients/{opaqueId}/tests/{testId}/report
GET  /api/patients/{opaqueId}/treatments?status=active|past|unknown
GET  /api/patients/{opaqueId}/treatments/{treatmentId}
GET  /api/patients/{opaqueId}/background
GET  /api/me/encounters
GET  /api/me/treatments
GET  /api/me/tests
```

En cada endpoint clínico revalidar cuenta, sesión, CMP/membresía si aplica, relación asistencial, autorización, finalidad, alcance y paciente del recurso. Filtros por tiempo se ejecutan en backend, paginados y sin exponer otros pacientes. `GET /api/me/*` se limita a la persona autenticada y no acepta un DNI arbitrario.

### 3A.11 Priorización de implementación por dependencia

| Orden | Hito | Entrega verificable |
|---|---|---|
| H0 | Normalizar alcance a **dos perfiles** y fijar diseño de atención | Wireframes de ambos portales + contrato de datos por atención |
| H1 | Login, registro simulado, médico CMP y paciente | Cuentas independientes, estados de validación y sesión segura |
| H2 | Permisos por paciente y autorización | Sin autorización nadie consulta datos ajenos |
| H3 | Modelo longitudinal por `Encounter` y 12 casos clínicos | Atenciones completas con síntoma, signos, diagnóstico, órdenes y tratamiento |
| H4 | Rediseño de visor y línea de tiempo | Lista cronológica filtrable y detalle completo de cada atención |
| H5 | Exámenes y documentos reales en estructura, **sintéticos en contenido** | Reportes agrupados, fechas, estados y trazabilidad |
| H6 | Tratamientos activos/pasados con duración real documentada o desconocida | No confundir prescripción con consumo real |
| H7 | Normalización FHIR/IPS, fallos y pruebas | Integridad, seguridad, conflictos y cobertura parcial verificadas |
| H8 | Pruebas de accesibilidad y validación con médico/paciente | Evaluación de tareas críticas y correcciones priorizadas |

### 3A.12 Criterios de aceptación nuevos (obligatorios)

1. El MVP muestra **exactamente dos accesos**: profesional y paciente; ningún tercer rol clínico se anuncia como implementado.
2. Una persona que escribe un CMP sin ser verificada no puede activarse como médico; una cuenta ficticia CMP inhabilitada no obtiene acceso profesional.
3. Una cuenta médica CMP verificada **sin autorización clínica** no lee el historial de un paciente.
4. Un paciente nunca obtiene datos de otro por cambiar DNI, URL, ID interno o parámetros.
5. Cada atención visible contiene como mínimo fecha/hora, establecimiento, tipo, profesional o «no registrado», y vínculos a datos presentes; los campos ausentes se etiquetan sin rellenarlos.
6. Una atención puede tener múltiples diagnósticos, exámenes y tratamientos; un informe posterior conserva su propia fecha/hora y asociación a la orden original.
7. Un paciente con atenciones en tres fuentes puede revisar en una misma línea de tiempo los eventos sin perder la procedencia.
8. Los filtros de **7/30/90 días y rango libre** son combinables, probados en límites de fecha, paginación y fuente caída.
9. La pestaña global de exámenes devuelve exactamente los estudios permitidos que satisfacen filtros (no simples tarjetas estáticas) y conserva estado preliminar/corregido.
10. Un tratamiento con `duración = 7 días` muestra el plazo indicado; uno de duración desconocida **no recibe** fecha final inventada ni estado activo de certeza falsa.
11. El resumen general de alergias, antecedentes, tratamientos activos/pasados se deriva de registros existentes, con procedencia y discrepancias visibles.
12. El paciente puede ver las solicitudes, autorizar, rechazar y consultar accesos; tras revocar, nuevas consultas se bloquean en servidor.
13. Se distinguen prescripción, dispensación y consumo declarado en medicación; no se deduce adherencia automáticamente.
14. Todos los casos clínicos sintéticos pasan pruebas de integridad: paciente–atención–orden–resultado–tratamiento–fuente.
15. No aparece la expresión «datos reales» o «conectado a RENHICE» cuando se trata de información simulada.

### 3A.13 Fuentes especializadas utilizadas en esta ampliación

- Colegio Médico del Perú. Portal institucional y servicio oficial «Conoce a tu Médico»: <https://portal.cmp.org.pe/> y <https://conoceatumedico.cmp.org.pe/>.
- Colegio Médico del Perú. «Constancia de Habilidad»: <https://cmp.org.pe/constancia-de-habilidad/>. Distinguir información pública del buscador, constancia formal e integración de terceros.
- Minsa. Norma Técnica N.° 139-MINSA/2018/DGAIN, R.M. N.° 214-2018-MINSA: <https://www.gob.pe/institucion/minsa/normas-legales/187487-214-2018-minsa> y <https://repositorio.minsa.gob.pe/handle/MINSA/81631>.
- HL7 FHIR R4 (4.0.1). `Encounter`: <https://hl7.org/fhir/R4/encounter.html>; `MedicationRequest`: <https://hl7.org/fhir/R4/medicationrequest.html>; `MedicationStatement`: <https://hl7.org/fhir/R4/medicationstatement.html>.



## 4. Arquitectura funcional y pantallas

### 4.1 Mapa de navegación
**Público:** inicio informativo — cómo funciona — alcance de simulación — seguridad y privacidad — ayuda — inicio de sesión.  
**Médico:** inicio / mis atenciones — buscar paciente — estado de autorización — resumen global — historial cronológico de atenciones (detalle) — exámenes — tratamientos — alergias — documentos — actividad propia — perfil CMP.  
**Paciente:** mi resumen — mis atenciones (detalle por consulta) — mis resultados — mis tratamientos activos y pasados — antecedentes y alergias — autorizaciones — quién accedió — mi cuenta — ayuda.  
**Operación interna (no un portal para usuario final):** provisionar cuentas sintéticas, verificación simulada CMP, vínculos institucionales, permisos, auditoría, integraciones, catálogos y salud de servicios.

### 4.2 Página pública
- Marca provisional neutral, subtítulo «Prototipo académico · Datos sintéticos» **permanente y visible**.
- Explicación sencilla de problema/solución, pasos, beneficios esperados y limitaciones.
- CTA primario «Ingresar como profesional»; secundario «Ingresar como paciente»; tercero «Explorar demostración guiada».
- No mostrar un catálogo de personas ficticias en una portada que se asemeje a un entorno productivo; ubicarlo en un «Modo demo» claramente separado.
- No afirmar «conectado a RENHICE», «compatible/certificado por MINSA», «ahorramos X soles» sin respaldo.

### 4.3 Login
- Separar «Acceso médicos» / «Acceso pacientes» en una entrada clara.
- Médico: correo verificado + contraseña + MFA y verificación previa de CMP/habilidad, vinculación institucional y activación administrada; **no** autoaprobar colegiatura introduciendo un número.
- Paciente: DNI **o** correo verificado + contraseña; registro ligado a identidad sintética preacreditada y MFA o verificación reforzada por riesgo; el conocimiento de DNI y acceso a un correo no sustituyen acreditación de identidad.
- Botón mostrar contraseña y recuperar acceso.
- Errores genéricos («Credenciales no válidas») sin revelar si existe una persona/cuenta.
- Evitar CAPTCHA intrusivo de entrada; aplicar defensas por riesgo y tasa.
- Contraseñas robustas con servidor que almacene hash apropiado; sesiones protegidas por cookies HttpOnly, Secure, SameSite; cierre global de sesión y reautenticación para acciones críticas.
- Para demo, cuentas prefijadas con credenciales individuales, no un único usuario administrador compartido.

### 4.4 Tablero del médico
- Encabezado: «Mis atenciones», institución activa, profesional, rol, fecha actual (Perú), última actividad.
- Acción central grande: «Buscar paciente por documento».
- Tarjetas discretas: «Atenciones del día», «Solicitudes pendientes», «Fuentes disponibles», «Eventos que requieren revisión», claramente etiquetadas «demo».
- Tabla de pacientes **asignados**, no todos los registros; orden por atención, filtros, búsquedas y estados.
- Avisos sobre sistemas no disponibles y últimos tiempos de sincronización.

### 4.5 Búsqueda y confirmación
- Etiquetas «Tipo de documento», «Número», «Motivo de consulta»; un error por campo, recuperación sencilla.
- Tras validar permisos, mostrar pantalla de confirmación de identidad con datos mínimos autorizados.
- No usar autocompletado público que permita enumerar pacientes; limitar intentos y registrar consultas.
- Si no hay autorización, mostrar flujo «Solicitar autorización» sin revelar resultados ni diagnósticos.

### 4.6 Visor clínico — estructura propuesta
**Barra superior fija:** nombre / ID interno / documento parcialmente oculto / sexo registrado si pertinente / fecha de nacimiento o edad calculada / estado de autorización / «Cerrar expediente» / fecha y hora de actualización.

**Primera franja: seguridad clínica y cobertura:**
- Alergias **confirmadas**, sospechadas y estado desconocido separados.
- Medicamentos relevantes y observaciones críticas validadas cuando correspondan.
- Identidad concordante o discrepante.
- Cobertura: «2 de 3 fuentes respondieron», fuentes y última actualización; «historial parcial» prominentemente.
- Indicadores clínicos no deben deducirse de ausencia de entradas.

**Segunda franja: navegación compacta:** «Resumen», «Línea de tiempo», «Exámenes», «Tratamientos», «Documentos», «Fuentes».

**Resumen:** condiciones activas, antecedentes relevantes, alergias, medicamentos, últimas atenciones, últimos laboratorios, últimas imágenes, vacunas/procedimientos si existieran, alertas de revisión. Orden visual en función de tareas del médico, no por conteos vistosos.

**Historial de atenciones:** cada tarjeta es una atención `Encounter` con fecha y hora, institución, médico/CMP ficticio, motivo, síntomas, signos, evaluación, diagnóstico, exámenes solicitados/resultados, tratamientos con duración, indicaciones y seguimiento. Tarjetas agrupadas por fecha; filtros por 7/30/90 días, 6/12 meses o rango personalizado, fuente, institución, especialidad, modalidad y médico; distinguir fecha de atención vs fecha del informe.

**Exámenes:** filtros de los últimos 7, 15, 30 y 90 días, 6/12 meses y rango libre, categoría, institución, finalizados/preliminares/corregidos, resultado fuera de rango, palabra clave, tipo de fecha (solicitud/toma/emisión), comparación de estudios relacionados; tabla legible y detalle contextual vinculado a la atención.

**Tratamientos:** fármaco, principio activo, dosis, forma, vía, frecuencia, inicio, **duración indicada**, fin conocido o no especificado, estado confirmado/incierto, prescriptor/CMP ficticio, establecimiento y atención original; filtros **activos/pasados/suspendidos/desconocidos**. No mezclar «indicado», «dispensado» y «declarado como usado».

**Documentos:** listado de informes y archivos, con fecha, autor, institución, estado, formato y opciones de vista/descarga controladas.

**Fuentes:** explicación técnica opcional «qué se consultó», calidad y cobertura; la mayoría de pacientes nunca debería necesitar ver IDs técnicos FHIR.

### 4.7 Diseño visual y accesibilidad
- Estética de sistema clínico sobrio: fondo claro, áreas limpias, 1–2 colores primarios, colores semánticos para advertencia/error/éxito, sin gradientes distractores.
- Tipografía legible (base ~16 px; preferir 16–18 px), encabezados jerárquicos, densidad adaptativa por pantalla; botones táctiles cómodos (~44 px preferido).
- Contraste conforme a **WCAG 2.2 AA**; significado nunca por color exclusivamente; texto e icono juntos.
- Tablas en escritorio, fichas verticales en móvil, columnas pegajosas solo si no ocultan información.
- Acceso por teclado, foco visible, etiquetas de campo, zonas `aria-live`, saltar contenido, navegación con lector de pantalla, mensajes de error próximos al campo.
- Soporte zoom 200–400 %, modo de reducción de movimiento, estados de carga, vacíos y errores, idioma español peruano y formatos dd/mm/aaaa, UTC en almacenamiento.
- Acciones destructivas («Revocar») con confirmación; evitar confirmaciones para toda operación inocua.
- No mostrar gráficos innecesarios, cifras «animadas», líneas ECG decorativas ni semáforos sin interpretación.
- Modo impresión: encabezado de identidad, fecha/hora, fuentes, estado y marca de demo; excluir controles de navegación.

## 5. Informes médicos: representación realista y verificable

### 5.1 Regla central
No basta una fila «Glucosa — 130 mg/dL». Un examen necesita **informe** más **observaciones atómicas**, fuente y estados. Se recomienda seguir la estructura FHIR R4 `DiagnosticReport` + `Observation` + `Specimen` y `DocumentReference`/PDF cuando corresponda. No todos los establecimientos ni todas las pruebas producen el mismo formato. Las fuentes para diseñar ejemplos son estándares, literatura de calidad y muestras desidentificadas con permiso, **no copiar resultados de pacientes reales**.

### 5.2 Campos de un informe de laboratorio
1. Emisor: laboratorio, establecimiento, servicio, dirección de demostración, identificador del laboratorio.
2. Identificación del documento: informe/orden, versión, estado (preliminar/final/corregido/anulado).
3. Paciente: nombre sintético, identificador interno y documento de simulación, edad/sexo solo cuando corresponda.
4. Solicitante: profesional ficticio y servicio/especialidad.
5. Tiempo: solicitud, extracción, recepción, proceso, validación y emisión, con zona horaria; no asumir que son iguales.
6. Muestra: suero/plasma/sangre total/orina/tejido, anatomía y condiciones; ayuno si está documentado.
7. Examen/panel: identificador original, código interoperable y método si está registrado.
8. Tabla: analito | resultado | unidad | intervalo referencial local | marca (alto/bajo/critico, si corresponde) | observación.
9. Comentarios: interferencias, hemólisis, limitaciones, recomendaciones de laboratorio y observaciones en texto.
10. Validación: profesional sintético y fecha; firma electrónica solo como «firma simulada» si no hay infraestructura válida.
11. Trazabilidad: proveedor de datos, documento fuente, versión, anotación de corrección y fecha de última sincronización.
12. Exportación controlada a PDF marcado «DATOS FICTICIOS – DEMOSTRACIÓN» en encabezado y pie.

**Referencia clínica:** no fijar una tabla «universal» de rangos: dependen de laboratorio, técnica, edad, características del paciente, embarazo y otras circunstancias. Si un laboratorio no entregó rango, mostrar «Intervalo no disponible», nunca inventarlo. Las alertas de valor crítico deben venir de políticas verificadas del laboratorio y no de constantes arbitrarias en frontend.

### 5.3 Paneles clínicos a simular (selección inicial)
| Área | Paneles / pruebas | Presentación |
|---|---|---|
| Hematología | hemograma: Hb, hematocrito, leucocitos, plaquetas, fórmula diferencial | panel completo, resultados con unidades y referencias propias |
| Bioquímica | glucosa, HbA1c, creatinina, urea, perfil lipídico | valores numéricos, tendencia cuando comparables |
| Función renal | creatinina, cálculo eGFR **solo si documentado/validado**; orina | resultados y método sin calculadora inventada |
| Hepática | ALT/TGP, AST/TGO, FA, bilirrubinas | panel y límites locales |
| Orina | examen completo de orina, sedimento; urocultivo | cuantitativos + cualitativos + microbiología |
| Microbiología | urocultivo, antibiograma y observaciones | organismo, recuento cuando aplique, susceptibilidad S/I/R y notas, sin aconsejar tratamiento |
| Serología | pruebas según caso sintético | cualitativo/reactivo/no reactivo e interpretación del laboratorio |
| Imagenología | radiografía, ecografía, tomografía | indicación, técnica, hallazgos, impresión y documento original |
| Cardiología | ECG | descripción técnica, ritmo, frecuencia, interpretación firmada ficticia |
| Anatomía patológica | histopatología ficticia | muestra, macroscopia, microscopía, conclusión, validación |
| Vacunación | vacuna, dosis, fecha, lote simulado | administración confirmada, fuente |

### 5.4 Ejemplo de informe numérico sintético, no consejo médico
```
LABORATORIO DE DEMOSTRACIÓN — RESULTADO FICTICIO
Informe LAB-2026-00421 · FINAL
Paciente: Marta Quispe Ramos · Documento: 90000001 [SINTÉTICO]
Origen: Centro de salud simulado · Fecha de extracción: 15/10/2026 08:10
Emisión: 15/10/2026 13:30 · Muestra: plasma
Solicitante: Dr./Dra. de demostración

GLUCOSA EN PLASMA, AYUNAS
Resultado                 158 mg/dL
Intervalo referencial     [Definido por laboratorio ficticio y validado]
Indicador                 [Solo si hay regla clínica revisada]
Método                    [Solo si corresponde y está respaldado]
LOINC                     [Código verificado según muestra y método]

Observación: Este resultado fue creado únicamente para probar el software.
Validación: profesional ficticio · Documento sin validez clínica.
```
Un segundo informe HbA1c de 8,2 % puede formar parte de la historia sintética de diabetes, pero la interpretación y los rangos no se generan al azar; deben revisarse con fuentes clínicas y un profesional. Para ilustrar la presentación, **no implica diagnóstico individual**.

### 5.5 Ejemplo de informe radiológico sintético
```
INFORME DE RADIOLOGÍA — DEMOSTRACIÓN
Estudio: Radiografía de tórax, dos proyecciones
Fecha del estudio: 13/10/2026
Motivo: Tos persistente [contexto ficticio]
Técnica: Proyecciones posteroanterior y lateral.
Hallazgos: No se identifican consolidaciones focales en este ejemplo.
Impresión: Sin hallazgos radiográficos agudos descritos en el modelo sintético.
Comparación: No se dispone de estudio anterior comparable.
Informante: Radiólogo de demostración · Emisión: 13/10/2026
Documento: SIMULACIÓN / NO UTILIZAR PARA DECISIONES CLÍNICAS.
```
Separar siempre «Hallazgos» de «Impresión». Si se incluye imagen, usar ilustración propia o DICOM de enseñanza con licencia adecuada y metadatos sanitizados, jamás una imagen clínica identificable tomada de Internet.

### 5.6 Estados, interpretaciones y límites
- `registered`, `partial`, `preliminary`, `final`, `amended/corrected`, `cancelled`, `entered-in-error` mapeados según recurso FHIR real; no mostrar estados inexistentes de manera engañosa.
- Diferenciar **resultado fuera del intervalo**, **resultado crítico comunicado**, **resultado pendiente**, **resultado cualitativo**, **resultado inválido**.
- Al corregirse un resultado, mantener versiones, razón/campo corregido y fecha; nunca borrar silenciosamente la versión previa.
- Si unidades incompatibles, no graficar ni deduplicar sin transformación validada; conservar valor/unidad originales.
- No inferir normalidad de una radiografía solo a partir de «sin observaciones».
- Historial de tendencias: mismo analito, misma magnitud, comparabilidad de muestra/método/unidades y advertencias pertinentes.

## 6. Dataset sintético de alta fidelidad

### 6.1 Volumen y composición sugeridos
- **Fase inicial:** 40–60 pacientes sintéticos, de los cuales **12–15 casos curados manualmente** y el resto generado por perfiles coherentes.
- **Demostración avanzada:** 100–150 expedientes sintéticos con variedad de edades, especialidades, cobertura y ausencia de datos, sin perseguir «volumen» a costa de coherencia.
- Tres sistemas de fuente separados (Minsa, EsSalud, clínica), cada uno con IDs propios y catálogos locales.
- 1–6 encuentros por expediente según guion; no repartir todos los pacientes igual ni forzar duplicados en todos.
- Documento sintético identificable; nombres, profesionales, tratamientos, fechas e instituciones con etiqueta de ficción.
- Al menos 3 historias con enfermedad crónica, 2 referencias, 2 alergias de alta relevancia, 2 informes corregidos, 2 casos sin registros, 2 problemas de autorización, 2 conflictos de identidad y 2 fuentes caídas.

### 6.2 Generación creíble, no aleatoria sin control
1. Definir **arquetipo clínico** (diabetes controlada/no controlada, hipertensión, anemia, asma, respiratorio agudo, embarazo solo con validación especializada, cirugía/procedimiento, persona sin antecedentes importantes, pediatría como fase posterior).
2. Crear cronología causal: consulta → hipótesis → solicitud → muestra → informe → tratamiento → control → referencia a otro establecimiento.
3. Respetar cronología física: fechas de toma anteriores a emisión, tratamiento posterior a indicación, orden anterior al informe; evitar atenciones después de muerte o fecha futura salvo una cita explícitamente programada.
4. Separar resultados de laboratorio y otros documentos por fuente y profesional.
5. Asignar atributos que dependan del paciente y el contexto (edad, sexo, condición clínica, medicamentos, muestra) y validar resultados dentro de límites plausibles por tipo de caso.
6. Introducir datos incompletos o contradictorios **intencionales** y etiquetarlos como pruebas de calidad.
7. Utilizar semilla determinista y fecha de referencia fija para pruebas y capturas reproducibles.
8. No confundir datos «realistas» con datos reales. Crear el dataset desde cero, sin desidentificación rudimentaria de pacientes verdaderos.

### 6.3 Doce historias demostrativas
1. **Diabetes:** control en Minsa y EsSalud; HbA1c y glucosa en fechas distintas, alergia en una sola fuente, tendencia cronológica.
2. **Hipertensión:** ECG previamente realizado en clínica; evaluación de solicitud en otro centro, distinción de necesidad clínica.
3. **Referencia por anemia:** hemograma y radiografía con procedencia distinta; informe completo y consulta previa.
4. **Persona sin problemas:** sin alergias conocidas documentadas vs ausencia de información, sin falsos diagnósticos.
5. **Rechazo de autorización:** tres fuentes posibles, acceso denegado desde servidor y auditado.
6. **Código local desconocido:** laboratorio emite código propio; catálogo propone mapeo pendiente, nunca lo asume equivalente automáticamente.
7. **Fuente no disponible:** disponibilidad parcial, aviso y reintento; no mostrar datos «en memoria» como recuperados en vivo.
8. **Medicamentos discordantes:** distintos regímenes prescritos; evitar unificación engañosa y destacar discrepancia para revisión.
9. **Informe corregido:** primer informe marcado reemplazado, segundo final, relación de versiones.
10. **Identidad ambigua:** nombre o nacimiento diferente entre fuentes, bloqueo de fusión hasta resolver.
11. **Resultado cualitativo:** urocultivo y antibiograma sintéticos completos con unidad/terminología adecuada.
12. **Representante legal / información protegida:** solo escenario de autorización simulado con revisión de reglas.

### 6.4 Calidad y gobernanza del dataset
- Ficha por caso: objetivo pedagógico, arquetipo, secuencia, documentos, resultados esperados, errores provocados y pruebas asociadas.
- Catálogos con procedencia documental, revisión clínica, código, display, unidad, specimen, método, mapeos y fecha de versión.
- Dos pasadas de validación: automática (esquema/consistencia) y revisión clínica humana (plausibilidad).
- Cada registro expone procedencia y `data_status`: completo, parcial, ausente, inconsistente, fuente caída, desactualizado.
- Rechazar copias de información personal; sanitizar logs, capturas, demo y exportaciones.

## 7. Estándares de interoperabilidad y correspondencia FHIR R4

### 7.1 Versionado
Adoptar **FHIR R4 / 4.0.1** como base de demostración y versionar el conjunto de perfiles nacionales evaluados. El borrador `HL7.FHIR.PE.COREPE#0.1` publicado el 19/06/2026 es **versión en desarrollo** y podría cambiar. No declarar «homologado» ni «certificado». Documentar qué elementos cumplen, no cumplen o están fuera del alcance de cada perfil.

### 7.2 Recursos propuestos
| Necesidad | Recursos FHIR R4 | Tratamiento |
|---|---|---|
| Identidad | `Patient` | múltiples identificadores con sistemas separados |
| Institución/profesional | `Organization`, `Practitioner`, `PractitionerRole` | procedencia y rol |
| Resumen clínico | `Composition` + `Bundle` (document) | IPS con secciones mínimas |
| Atención | `Encounter` | tipo, inicio/fin con hora, servicio, médico/CMP, institución, motivo y vínculos a evaluaciones, exámenes, diagnóstico y tratamiento |
| Diagnósticos | `Condition` | estado, categoría, código, fecha |
| Alergias | `AllergyIntolerance` | sustancia, certeza, reacción y condición de conocimiento |
| Medicación | `MedicationRequest`, `MedicationStatement`, `Medication` | prescripción versus declarado como tomado |
| Solicitud de examen | `ServiceRequest` | orden, estado, razón y solicitante |
| Resultados atómicos | `Observation` | valores, unidades, rangos, fecha y estado |
| Informe agrupado | `DiagnosticReport` | informe, observaciones, impresión, versión |
| Muestras | `Specimen` | toma, tipo, recepción si disponible |
| Documentos | `DocumentReference` | PDF/autorizaciones, metadatos, permisos |
| Imágenes | `ImagingStudy` | referencias a estudio DICOM si existe infraestructura compatible |
| Procedimientos | `Procedure` | acto clínico documentado |
| Vacunas | `Immunization` | fecha/dosis/fuente |
| Autorización | `Consent` según perfil local | política por persona, propósito, plazo y alcance |
| Trazabilidad origen | `Provenance` | emisor/transformación/versiones |
| Seguridad | `AuditEvent` | eventos de acceso sin incluir contenido sensible en bitácora |

### 7.3 Terminologías
- **LOINC** para pruebas y observaciones, verificando código exacto para tipo de muestra, propiedad, método y unidad.
- **CIE-10** para condiciones donde sea coherente con los registros simulados; considerar evolución a otras clasificaciones solo cuando una fuente lo sustente.
- **UCUM** para codificar las unidades: la presentación humana puede decir `mg/dL`, pero el código debe ser uno válido, no texto arbitrario.
- **SNOMED CT** para conceptos clínicos si su disponibilidad/licencia y ámbito de uso permiten incorporarlo.
- Catálogos nacionales de documentos, IPRESS, profesionales y medicamentos: verificar sistemas de identificación oficiales y licencias. No inventar URIs «oficiales».
- Conservar **código fuente + sistema fuente + versión + equivalencia validada**. Un mapeo incierto se marca «No normalizado», sin perder el registro.

### 7.4 Conciliación de identidades y conflictos
- No fusionar solo por similitud de nombre.
- Identificador interno `patient_uuid` no derivado del DNI; identificadores alternativos en tabla aparte.
- Validar sexo/fecha de nacimiento/nombre **solo como comprobación**, no como prueba absoluta.
- En discrepancia, separar registros y bloquear consolidación sensible hasta revisión.
- Mantener información fuente y metadatos; no sobreescribir un medicamento con otro de distinta dosis al «deduplicar».

### 7.5 Control de conformidad
- Validación sintáctica de cada recurso y referencia interna.
- Validación semántica de terminología y unidades.
- Verificación contra perfiles COREPE disponibles, con reporte por recurso y versión.
- Construcción de IPS `Composition`/`Bundle` mínimo con secciones obligatorias y reason/emptyReason coherente.
- Pruebas de interoperabilidad positivas y negativas: códigos locales, recursos ausentes, XML/JSON malformado, referencia rota, duplicidad e identificadores erróneos.
- Comparar con guía oficial de MINSA y ejemplos oficiales, registrando diferencias que todavía estén en borrador.

## 8. Motor de «posibles exámenes repetidos»

**Cambio conceptual:** sustituir «repetido» categórico por **«posible examen previo relevante»**, que el médico puede consultar antes de solicitar otro estudio. No confundir realización repetida por necesidad clínica con desperdicio.

### 8.1 Condiciones mínimas para sugerir coincidencia
- Identidad del paciente confirmada; examen solicitado identificado y codificado de forma confiable.
- Comparabilidad: prueba/analito, tipo de muestra, método, lateralidad, modalidad, región anatómica, contexto clínico.
- Coincidencia temporal configurable y **validada por especialidad**; ningún «30/90 días» se considera verdad médica general.
- Resultado previo en estado adecuado; fecha de toma y fecha de informe conocidas.
- Fuente y disponibilidad del documento original.
- Caso de indicaciones nuevas, agravamiento, control evolutivo, calidad insuficiente o guía clínica: posibles motivos legítimos para repetir.

### 8.2 Respuesta UI
- Encabezado: «Existe un estudio previo relacionado».
- Resumen: estudio, fecha de realización, institución, tipo de muestra, estado, resultado y enlace.
- Explicación concreta: «Coinciden prueba y muestra; se realizó hace N días; revise si es clínicamente comparable».
- Acciones: «Ver informe», «Mantener solicitud», «Revisar más tarde»; requerir motivo al simular mantener cuando sea relevante.
- No bloquear una orden, no recomendar cancelarla automáticamente, no cuantificar «examen evitado» hasta tener confirmación y una metodología de validación.

### 8.3 Detección en varias fuentes
- No deduplicar `DiagnosticReport` y sus propias `Observation` como si fueran pruebas independientes.
- Distinguir informe único replicado en dos sistemas versus dos estudios realmente realizados.
- Para imagenología, diferenciar RX tórax PA de RX tórax dos proyecciones, o estudios con/sin contraste.
- Para laboratorios, comparar resultados longitudinales solo si valores y métodos son compatibles.
- Conservar evidencias, nivel de confianza del mapeo y reglas que activaron la alerta.

## 9. Autorización, privacidad, seguridad y cumplimiento

### 9.1 Marco peruano y terminología
Normativa de referencia: Ley 30024, Reglamento DS 009-2017-SA y modificación DS 020-2025-SA, Ley 29733 y Reglamento DS 016-2024-JUS; además NTS 139-MINSA/2018/DGAIN para gestión de historia clínica. La legislación contempla supuestos especiales y excepciones; **el sistema no debe decidirlos por interpretación informal**. Antes de cualquier tratamiento real se requiere evaluación jurídica y del contexto institucional. El perfil COREPE denomina **Autorización** al control de acceso RENHICE.

### 9.2 Modelo de acceso
Implementar RBAC (roles) + ABAC (atributos del caso): identidad, establecimiento, relación de atención, finalidad, autorización, alcance, sensibilidad, fecha y estado. Cada endpoint debe verificar permisos y negar por defecto. Controles equivalentes para vista, descarga, impresión y APIs.

### 9.3 Inicio de sesión y cuentas
- Registro por invitación o provisión validada; la mera posesión de un DNI no crea cuenta del titular.
- MFA para profesionales y acciones de alto riesgo; considerar passkeys/WebAuthn o segundo factor adecuado.
- Hash robusto de contraseñas (`Argon2id` o mecanismo probado del proveedor de identidad), secretos fuera del repositorio.
- Sesiones cortas, rotación de sesión tras login, cierre efectivo, revocación de tokens y protección CSRF.
- Cookies `HttpOnly`, `Secure`, `SameSite`; HTTPS; cabeceras CSP/HSTS, validaciones, controles anti XSS/SQLi/SSRF, límites de tamaño.
- Rate limiting y protección contra enumeración de DNI/cuentas; bloqueo adaptativo sin negar atención por intentos inocuos.
- Roles verificables en base de datos y API, no solo `hidden` del frontend.

### 9.4 Autorización del paciente
Campos: titular, representante si corresponde, profesional, institución, finalidad, recurso/alcance, emisión, inicio, vencimiento, estado y método de validación. Historizar cambios y revocaciones; negar nuevas consultas luego de revocación, sin prometer retirar copias ya legalmente generadas. Evitar solicitudes que silenciosamente permitan «todo para siempre».

### 9.5 Datos especialmente delicados
- Clasificar expedientes y metadatos, aplicar mínimo privilegio, retención justificada y cifrado en tránsito y reposo.
- Protección adicional a ámbitos descritos en regulación; las políticas específicas deben definirse con asesoría jurídica y médica.
- No usar datos clínicos en métricas analíticas de terceros, logs del navegador, herramientas de sesión grabada ni servicios externos no autorizados.
- Bloquear indexación, previsualizaciones abiertas, enlaces sin firma o expiración y almacenamiento caché público.
- Política de respaldo, restauración, borrado y respuesta ante incidentes; ensayo de restauración con datos sintéticos.

### 9.6 Auditoría
Registrar: quién, qué rol, institución, cuándo (UTC), paciente referenciado mediante identificador controlado, propósito, acción, resultado, autorización utilizada, IP/cliente cuando legal y operativamente necesario, correlación y fuente. Proteger integridad y acceso; no guardar diagnóstico, contenido de informe ni contraseña en logs. Paciente puede ver registro comprensible de accesos relevantes.

### 9.7 Tolerancia a fallos segura
- **No** sustituir una consulta remota fallida por datos locales como si fueran confirmación de una fuente conectada.
- Mostrar «Fuente no disponible» o «Última copia conocida de fecha X» únicamente si la política permite caché clínico seguro, etiquetado, cifrado y autorizado. Mejor **no habilitar caché offline de datos clínicos en el MVP**.
- La simulación de offline puede presentar interfaz y casos ficticios en módulo separado, nunca aparentar conectividad real.
- Política de emergencia que preserve seguridad y trazabilidad; no autorización general por «modo emergencia».

## 10. Arquitectura técnica concreta

### 10.1 Opciones y elección
**Preferida para grupo pequeño:** Next.js + TypeScript para web y BFF/API; PostgreSQL (por ejemplo Prisma/Drizzle); proveedor de identidad mantenido o librería probada; simuladores de FHIR separados en lógica de servidor; almacenamiento privado de informes. Añadir FastAPI **solo** si se requiere reusar motor Python existente como servicio desacoplado; evitar complejidad innecesaria.

**No mantener tres versiones paralelas** (`site`, `web`, `app`) como productos equivalentes. `site/` será principal; `web/` quedará como referencia estática y `app/` como módulo experimental hasta decidir si se integra.

### 10.2 Módulos del código sugeridos
```
site/
  app/
    (public)/                 home, privacidad, ayuda
    (auth)/login/             identidad y MFA
    (professional)/dashboard/ búsqueda y mis atenciones
    (professional)/patients/[opaque-id]/
    (patient)/my-health/      portal de titular
    (admin)/                  roles, fuentes, auditoría
    api/                      APIs protegidas
  components/
    ui/                       accesibilidad y diseño
    clinical/                 resumen, tablas, alertas, PDFs
    consent/                  autorización
    patient/                  portal del paciente
  lib/
    auth/                     sesiones y permisos
    fhir/                     cliente, parseo, validación
    interoperability/         gateway, identidad, adaptadores
    terminology/              catálogos, mapeos
    clinical/                 modelos, comparabilidad, alertas
    audit/                    eventos de acceso
  db/                         esquema, migraciones, semillas
  tests/                      unitarias, integración, E2E
  fixtures/                   casos clínicos sintéticos versionados
```

### 10.3 API propuesta (ejemplos, no implementación existente)
```
POST /api/auth/login
POST /api/auth/logout
GET  /api/session/me
POST /api/patients/lookup                # búsqueda protegida por finalidad
POST /api/access-requests              # solicitud de autorización
POST /api/access-requests/{id}/approve
POST /api/access-requests/{id}/reject
POST /api/access-requests/{id}/revoke
GET  /api/patients/{opaqueId}/summary
GET  /api/patients/{opaqueId}/encounters
GET  /api/patients/{opaqueId}/diagnostics
GET  /api/patients/{opaqueId}/reports/{reportId}
POST /api/patients/{opaqueId}/orders/check # simulador de coincidencia
GET  /api/me/access-history
GET  /api/operations/connectors           # roles técnicos
```
Peticiones de lectura no deben cambiar el estado de autorización; guardar auditoría como efecto secundario de servidor. Evitar colocar DNI en URLs, métricas o trazas.

### 10.4 Tablas en PostgreSQL (modelo mínimo)
- `users`, `identities`, `roles`, `user_role_assignments`, `institutions`, `staff_memberships`.
- `patients`, `patient_identifiers`, `patient_source_links`, `identity_conflicts`.
- `care_relationships`, `access_requests`, `authorizations`, `authorization_events`.
- `source_systems`, `source_health_checks`, `fhir_resources`, `terminology_mappings`, `validation_results`.
- `encounters`, `clinical_conditions`, `allergies`, `medication_records`, `lab_reports`, `lab_observations`, `imaging_reports`, `clinical_documents` (tablas de lectura optimizadas derivadas de FHIR; mantener origen).
- `audit_events`, `security_events`, `report_versions`, `duplicate_alerts`, `alert_decisions`, `data_quality_issues`.

Cada fila relevante: UUID interno, fuente, identificador original, fecha efectiva, fecha de ingestión, versión, estado, sensibilidad, hash referencial de documento y metadatos de auditoría. No duplicar datos sin una necesidad justificada; definir propietario de información.

## 11. Calidad, disponibilidad y confianza

- **Disponibilidad:** cada origen responde, no responde, timeout, respuesta inválida o sin paciente. Mostrar diferencias entre «no se encontró» y «no pudimos consultar».
- **Actualidad:** fecha clínica de cada evento y fecha técnica de última sincronización, ambas visibles donde agregan valor.
- **Duplicados:** conservar copias y distinguir misma información replicada de exámenes nuevos.
- **Integridad:** detectar referencias FHIR rotas, perfiles incompletos, recursos mal formados, valores imposibles y errores de mapeo.
- **Origen:** rastrear hasta institución, documento, versión y método; nunca presentar resúmenes sin fuente.
- **Seguridad operacional:** timeouts, límite de concurrencia, reintento exponencial solo de lecturas idempotentes, circuit breaker, mensajes sencillos de error.
- **Escalabilidad:** paginación y carga progresiva; no traer todos los PDFs ni estudios a memoria al abrir el visor.
- **Búsqueda:** índices en identificadores tokenizados/controlados, registros de acceso, periodos y tipos; evitar usar el DNI como llave pública.
- **Continuidad:** backups, restauración ensayada, manejo de configuración por ambiente, monitoreo de errores y trazas sin contenido clínico.

## 12. Pruebas y requisitos de aceptación

### 12.1 Pruebas automatizadas
- Unitarias: validación DNI/formato, mapeos, filtros, cronología, autorización, reglas de alertas.
- Integración: 3 APIs simuladas, gateway, fallos de fuente, auditoría, persistencia y expiración.
- Seguridad: intento sin login (401), rol incorrecto (403), paciente equivocado, acceso tras revocación, IDOR, enumeración, CSRF, XSS, manipulación de tokens, descargas no autorizadas.
- FHIR: estructura R4, perfiles COREPE disponibles, LOINC/UCUM, `Composition`/`Bundle`, referencias y `OperationOutcome`.
- E2E (Playwright): login → búsqueda → solicitud → autorización → resumen → informe → cierre.
- Accesibilidad (axe + revisión humana): teclado, contraste, foco, lector de pantalla, zoom y responsive.
- Rendimiento: consulta con 1 fuente, 3 fuentes, 1 caída y resultados grandes; no prometer tiempos de red externa.
- Datos sintéticos: coherencia de fechas, estados, identidad, unidades, variables clínicas, cero datos reales.

### 12.2 Criterios medibles propuestos (objetivos del equipo, no resultados observados)
| Indicador | Meta inicial propuesta | Cómo medir |
|---|---|---|
| Control de acceso | 100 % de endpoints clínicos protegidos | pruebas de seguridad automatizadas |
| Privacidad de URL | 0 DNI en URL de paciente o informe | tests y revisión |
| Integridad demostrativa | 100 % de archivos clínicos con marca «datos sintéticos» | revisión automatizada/manual |
| Rastreabilidad | 100 % de resultados visibles con fuente y fecha | pruebas E2E |
| Error de fuente | 100 % de caídas presentan estado incompleto | pruebas de fallo |
| Exactitud de datos curados | 100 % de los casos dirigidos revisados por profesional | checklist con firma de revisión |
| Criterios WCAG | objetivo WCAG 2.2 AA | auditoría automática + manual |
| Tiempo de encontrar alergia | comparar tarea antes/después, sin fijar mejora ficticia | pruebas de usabilidad |
| Examen previo relevante | precisión y utilidad medidas contra casos validados, no «exámenes evitados» presuntos | panel clínico de revisión |

### 12.3 Casos de aceptación indispensables
1. Un médico sin sesión no puede consultar ni ver que exista un DNI.
2. El mismo médico con sesión, pero sin finalidad/relación/autorización aplicable, no puede abrir resultados.
3. Un paciente solo ve datos sintéticos asociados a su propio usuario autenticado.
4. La revocación invalida nuevas consultas; accesos previos permanecen auditados.
5. La fuente EsSalud ficticia cae y el resumen muestra claramente «parcial», sin rellenar datos como nuevos.
6. Dos fuentes discrepan sobre un medicamento: se muestran ambas con fecha y origen.
7. Una observación corregida conserva estado/versiones y no se trata como examen adicional.
8. Un informe radiológico presenta indicación, técnica, hallazgos, impresión y fuente.
9. El sistema muestra «alergias no registradas» y no «sin alergias» si no hay confirmación.
10. El médico ve examen previo, pero puede justificar que es clínicamente necesario repetirlo.
11. Un documento descargado queda marcado como datos ficticios y no se comparte por enlace permanente.
12. El botón Atrás luego del cierre de sesión no recupera una ficha clínica desde caché público.

## 13. Validación real con usuarios (Design Thinking)

### 13.1 Usuarios de prueba
- Al menos 2 médicos de distintas especialidades y 1 profesional de enfermería o laboratorio, para revisión de tareas clínicas e informes.
- 4–6 pacientes o usuarios potenciales para lenguaje y flujos, sin compartir datos de salud personales.
- 1 representante de TI/seguridad para revisar integración y permisos.
- Reclutamiento voluntario, consentimiento de participación en estudio de usabilidad, sin recopilar expedientes reales.

### 13.2 Tareas de prueba
1. Encontrar alergia relevante desde la pantalla inicial.
2. Identificar la última HbA1c y dónde se hizo.
3. Distinguir que falta respuesta de una fuente.
4. Revisar radiografía anterior y decidir si puede ayudar a evitar repetir una solicitud (sin decisión clínica real).
5. Aprobar, rechazar y revocar solicitud como paciente.
6. Explicar qué datos son demostrativos, de qué centro provienen y cuándo fueron emitidos.

### 13.3 Instrumentos de medición
- Tiempo por tarea y tasa de éxito; número de clics solo como indicador secundario.
- Errores, dudas, navegación y lenguaje confuso.
- Escala breve de facilidad/usabilidad y pregunta de confianza sobre origen y alcance.
- Hallazgos con gravedad, causa, evidencia y solución propuesta.
- Repetir pruebas después de correcciones; no extrapolar conclusiones de 4 entrevistas cualitativas a toda la población.

## 14. Plan de trabajo priorizado

**P0 — base obligatoria** (sin esto, ninguna demo debe aparentar seguridad real):
- Acordar alcances y guion médico; revisar terminología «Autorización»; marcar datos sintéticos.
- Migrar datos fuera del cliente y cerrar endpoints; autenticación y roles reales de demostración.
- Base de datos persistente; autorización de acceso en backend; bitácora protegida.
- Corregir navegación por DNI en URL, retirar fallbacks engañosos y lista de pacientes pública.
- Crear 12 casos dirigidos y diseño base de visor/resumen.

**P1 — MVP que se presenta:**
- Portal médico; búsqueda autorizada; resumen; línea de tiempo; informes de laboratorio y radiología; PDF sintético.
- Portal paciente y solicitudes de autorización; revocación; accesos.
- Indicador de cobertura y error de fuentes; alertas explicables de posible examen previo.
- Primer `Composition` + `Bundle` IPS y validación R4/COREPE donde proceda.
- Pruebas funcionales, permisos y accesibilidad.

**P2 — mayor fidelidad:**
- Historia longitudinal más extensa; informes de microbiología, patología y ECG.
- Conflictos de identidad, versiones corregidas, discrepancias de medicamentos y trazabilidad granular.
- Dashboards técnicos y mapeos de códigos locales verificados; 100+ expedientes sintéticos.
- Revisión clínica por profesionales y evaluación de usabilidad antes/después.

**P3 — investigación futura:**
- Adaptadores institucionales reales bajo autorización.
- Integración con servicios de identidad, RENIPRESS, contratos, consentimiento institucional y sistemas clínicos.
- DICOM/PACS, alta disponibilidad, integraciones SMART on FHIR y auditoría institucional.
- Conectividad limitada/offline con arquitectura segura formalmente aprobada.

### 14.1 Sprints orientativos para un equipo académico de tres personas
| Bloque | Contenido | Dependencia | Entregable |
|---|---|---|---|
| S0 | inventario, diseño funcional, criterios, fuentes | ninguna | backlog, prototipo de flujo, modelo de amenazas |
| S1 | identidad/roles, PostgreSQL, cierre de endpoints | S0 | login, permisos, migraciones y tests |
| S2 | autorización, portal paciente y bitácora | S1 | flujo completo de acceso permitido/denegado |
| S3 | datasets clínicos curados, catálogos | S1 | 12 historias sintéticas coherentes |
| S4 | resumen, línea de tiempo, estados, procedencia | S2–S3 | visor clínico principal |
| S5 | informes lab/radiología y PDF | S3–S4 | reportes detallados y validación |
| S6 | motor de alertas, FHIR IPS, fallos de fuentes | S4–S5 | interoperabilidad demostrable |
| S7 | accesibilidad, seguridad, pruebas con usuarios, documentación | S1–S6 | MVP listo para evaluación académica |

**Responsabilidades sugeridas:** integrante A: frontend y UX; B: backend/auth/PostgreSQL; C: datos clínicos/FHIR/testing; revisión cruzada de seguridad y validación en cada sprint. Necesitarán al menos asesoría puntual de profesional de salud y TI/seguridad para validar contenido.

## 15. Backlog granular por entregable

Cada ticket debe incluir «Como [usuario], quiero [capacidad] para [resultado]», evidencia, caso normal, casos de error, tratamiento de privacidad, pruebas y definición de terminado. Lista inicial de tickets:

**A. Identidad y seguridad:** A01 login, A02 roles, A03 MFA profesional, A04 sesión/caducidad, A05 control servidor, A06 autorización, A07 revocación, A08 auditoría, A09 rate limiting, A10 eliminar DNI de URL, A11 CSP/HTTPS, A12 protección de documentos, A13 política de logs.

**B. Usuario y UX:** B01 sistema visual, B02 navegación por perfil, B03 móvil, B04 accesibilidad, B05 búsqueda, B06 estados vacíos, B07 errores, B08 confirmaciones, B09 soporte/ayuda, B10 impresión, B11 loading, B12 cobertura de fuentes, B13 lenguaje inclusivo, B14 portal paciente.

**C. Clínica:** C01 historial coherente, C02 encuentros, C03 alergias, C04 diagnósticos, C05 medicamentos, C06 prescripciones vs uso, C07 laboratorio/hemograma, C08 bioquímica, C09 microbiología, C10 imagenología, C11 ECG, C12 documentos, C13 informes corregidos, C14 tendencias, C15 línea temporal, C16 alertas, C17 registro de decisión, C18 datos ausentes, C19 identidad conflictiva.

**D. Interoperabilidad:** D01 FHIR R4 parseo, D02 COREPE, D03 IPS Bundle/Composition, D04 terminologías, D05 códigos locales, D06 UCUM, D07 Provenance, D08 AuditEvent, D09 Consent/Autorización, D10 capa HTTP, D11 reintentos/timeouts, D12 circuit breaker, D13 validación perfiles, D14 concordancia de identidad, D15 metadatos de origen.

**E. Gestión y calidad:** E01 migraciones y datos semilla, E02 catálogo de fuentes, E03 health checks, E04 acceso auditor, E05 manejo de correcciones, E06 tests unitarios, E07 tests E2E, E08 pruebas seguridad, E09 evaluación accesibilidad, E10 evaluación médica, E11 feedback pacientes, E12 documentación y manual, E13 despliegue demo, E14 backups, E15 pipeline CI.

## 16. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Que parezca acceso real a RENHICE | confusión pública | marca sintética persistente y textos honestos |
| DNI sin control | privacidad/abuso | sesión, alcance, autorización y servidor |
| Informe médico incorrecto | decisiones equivocadas | solo demo, revisión clínica, no recomendaciones automáticas |
| Códigos LOINC/UCUM mal elegidos | falsas coincidencias | catálogo revisado, incertidumbre explícita |
| Alergia ausente interpretada como negada | seguridad del paciente | estados clínicos explícitos |
| Reglas de repetición simplificadas | exámenes innecesariamente bloqueados | alerta informativa y juicio clínico |
| Fallo de fuente ocultado | falsa sensación de historia completa | cobertura y fecha visibles, fail closed |
| Exceso de módulos para equipo pequeño | proyecto inacabado | P0/P1 obligatorios, P2/P3 opcionales |
| Datos sintéticos absurdos | demo poco creíble | arquetipos y revisión clínica |
| Log o PDF expuesto | privacidad y seguridad | control de acceso, minimización, expiración y auditoría |
| Cambios normativos/COREPE borrador | incompatibilidad | versionado y revisión de fuentes antes de piloto |

## 17. Condiciones de salida del MVP 2.0

Se considera completo para presentación académica cuando el equipo pueda demostrar **sin acceder a datos reales**: login médico, login paciente, solicitud/aprobación de autorización, búsqueda con permisos, resumen de varias fuentes, acceso a resultado de laboratorio completo y radiología estructurada, posible coincidencia de examen, caída de un servicio con mensaje de parcialidad, revocación y auditoría, cierre de sesión y pruebas automatizadas. Debe existir documentación de límites y validación de datos por un profesional.

## 18. Guion final de la demostración

**Caso central:** paciente sintética con diabetes y antecedente de reacción a penicilina registrada únicamente en una fuente; atendida después en otro sistema.
1. Profesional inicia sesión (rol demostrativo).
2. Busca identificación y solicita autorización; el médico todavía no ve resultados.
3. Paciente entra a su portal, revisa finalidad/alcance, autoriza por periodo corto.
4. Médico consulta resumen: descubre alergia registrada en otra institución, medicación y resultados de HbA1c/Glucosa.
5. Abre informe original completo: fecha de muestra, unidades, intervalo referencial del laboratorio, emisor, estado y versión.
6. Solicita evaluar una prueba; sistema encuentra estudio reciente, explica por qué podría ser relevante y deja decisión al profesional.
7. Se simula caída de una fuente: el visor alerta «Historial parcial», sin fabricar información.
8. Paciente revisa quién accedió y revoca; se intenta nueva consulta y el servidor la deniega y audita.
9. Se muestra una visualización técnica del FHIR `Composition/Bundle` solo al profesor/audiencia técnica.
10. Conclusión: demostramos **acceso responsable a información dispersa**; no demostramos un despliegue real de RENHICE ni una reducción cuantificada de exámenes.

## 19. Fuentes primarias y de consulta (verificadas octubre 2026)

**Perú:**
- MINSA, guía en desarrollo COREPE IPS Perú (FHIR R4; borrador 0.1, 19/06/2026): https://dyaku.minsa.gob.pe/guides/index.html
- MINSA, artefactos y «Autorización RENHICE»: https://dyaku.minsa.gob.pe/guides/artifacts.html
- MINSA, Conectatón 2026: https://www.gob.pe/institucion/minsa/noticias/1415982-conectaton-minsa-peru-2026-presenta-exitosos-resultados-en-interoperabilidad-entre-historias-clinicas-electronicas
- Reglamento RENHICE modificado, DS 020-2025-SA: https://www.gob.pe/institucion/minsa/normas-legales/7479922-020-2025-sa
- Texto del DS 020-2025-SA (El Peruano): https://busquedas.elperuano.pe/dispositivo/NL/2463489-2
- Reglamento de Ley 29733, DS 016-2024-JUS: https://www.gob.pe/institucion/anpd/normas-legales/6554453-n-016-2024-jus
- Norma técnica de historia clínica, NTS 139, resolución y repositorio: https://www.gob.pe/institucion/minsa/normas-legales/187487-214-2018-minsa ; https://repositorio.minsa.gob.pe/handle/MINSA/81650
- Instituto Nacional de Salud, documentación de calidad en laboratorio e ISO 15189: https://repositorio.ins.gob.pe/items/e24d9301-b354-4aa4-a8e1-1802be6bb1c0
- MINSA, compendios digitales de salud: https://www.gob.pe/institucion/minsa/noticias/1304375-minsa-consolida-el-marco-normativo-en-salud-digital

**Estándares, informes y experiencia:**
- HL7 FHIR R4 DiagnosticReport: https://hl7.org/fhir/R4/diagnosticreport.html
- HL7 FHIR R4 Observation: https://hl7.org/fhir/R4/observation.html
- HL7 FHIR R4 Consent: https://hl7.org/fhir/R4/consent.html
- HL7 FHIR R4 AuditEvent: https://hl7.org/fhir/R4/auditevent.html
- HL7 FHIR International Patient Summary 2.0.1: https://hl7.org/fhir/uv/ips/2.0.1/en/Structure-of-the-International-Patient-Summary.html
- SMART on FHIR App Launch 2.2.0: https://hl7.org/fhir/smart-app-launch/STU2.2/app-launch.html
- MedlinePlus, cómo interpretar resultados e intervalos locales: https://medlineplus.gov/spanish/pruebas-de-laboratorio/como-entender-sus-resultados-de-pruebas-de-laboratorio/
- MedlinePlus, hemoglobina A1c: https://medlineplus.gov/spanish/pruebas-de-laboratorio/prueba-de-hemoglobina-a1c/
- Brigham and Women's Hospital, componentes de reporte radiológico: https://www.brighamandwomens.org/assets/BWH/radiology/pdfs/components-radiology-report.pdf
- OWASP ASVS 5.0: https://asvs.owasp.org/
- NIST SP 800-63B-4 (2025): https://csrc.nist.gov/pubs/sp/800/63/B/4/final
- WCAG 2.2 AA: https://www.w3.org/TR/WCAG22/

**Importante:** esta bibliografía describe los fundamentos de diseño; no reemplaza la verificación de la normativa vigente, la revisión de perfiles COREPE ni la validación clínica y jurídica previa a una implementación con datos reales.

## 20. Checklist de aceptación previo al desarrollo de cada módulo

- [ ] ¿La función contribuye al problema de interoperabilidad elegido en Design Thinking?
- [ ] ¿Está claramente identificado el usuario, su objetivo y el dato mínimo necesario?
- [ ] ¿El acceso se verifica en servidor con rol, relación, finalidad y autorización aplicable?
- [ ] ¿Puede el usuario identificar origen, fecha y estado del dato?
- [ ] ¿Distingue dato ausente, estado negativo y fuente caída?
- [ ] ¿Evita producir conclusiones médicas automáticas sin fundamento?
- [ ] ¿Es accesible sin mouse, en móvil y con alto zoom?
- [ ] ¿Existe un estado de carga, sin datos, error y sesión vencida?
- [ ] ¿Contempla información especialmente protegida y evita datos reales?
- [ ] ¿Existe caso de prueba positivo, negativo y de fallo?
- [ ] ¿El informe/documento está claramente rotulado como sintético?
- [ ] ¿La documentación deja explícito qué está simulado y qué realmente se ejecuta?

---

**Decisión final propuesta:** priorizar primero **autenticación + autorización + visor clínico + resultados completos + trazabilidad**, luego incorporar la parte avanzada de terminologías, alertas y experiencias adicionales. Esto maximiza el valor académico de la solución escogida sin convertir el proyecto en otro SIHCE completo.
