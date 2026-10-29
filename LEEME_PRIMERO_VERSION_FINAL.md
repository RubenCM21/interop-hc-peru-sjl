# Historia clínica conectada · SJL · Versión académica V2

Proyecto de Design Thinking (UNI-FIIS). Código modificado sobre `interop-hc-peru-SJL-mejorado.zip`.

> **SIMULADOR ACADÉMICO.** Los 24 pacientes, 2 cuentas médicas, atenciones, exámenes y autorizaciones son ficticios. Las denominaciones de instituciones de SJL son referenciales; no existe conexión real con ellas, RENHICE, RENIEC, CMP ni servicios del Minsa. **No ingresar datos reales de salud.**

## Inicio rápido en Windows

1. Instalar Node.js LTS compatible con Next.js 16 (Node 22 recomendado).
2. Extraer este ZIP y abrir `interop-hc-peru-main` en VS Code.
3. Abrir una terminal en esa carpeta y ejecutar:

```powershell
cd site
npm ci
npm run dev
```

4. Abrir `http://localhost:3000/ingresar`.

Si `npm ci` falla por la conexión, comprobar acceso a `https://registry.npmjs.org` e intentar `npm install`. Este ZIP **no incluye** `node_modules` para mantener un tamaño reducido.

## Usuarios de prueba

| Perfil | Identificador adicional | Correo | Contraseña |
|---|---|---|---|
| Médica ficticia | CMP-DEMO-001 | medico.demo@sjl.test | DemoMedico2026! |
| Médico ficticio 2 | CMP-DEMO-002 | medico2.demo@sjl.test | DemoMedico2026! |
| Paciente ficticio 1 | DNI 90000001 | paciente01@demo.sjl.test | DemoPaciente2026! |
| Paciente ficticio 2 | DNI 90000002 | paciente02@demo.sjl.test | DemoPaciente2026! |

Hay 24 cuentas de pacientes: `paciente01` a `paciente24`, con DNI `90000001` a `90000024` y contraseña de demostración compartida. Seleccionar el perfil en el login carga el primer usuario de demostración. Estas claves son públicas y **no protegen información real**.

## Recorrido para la exposición

1. Iniciar sesión con `CMP-DEMO-001`, correo de médica y contraseña indicada.
2. En **Solicitudes de acceso**, ingresar `90000001` y la finalidad de la consulta.
3. Pulsar **Enviar solicitud** y **Cerrar sesión**.
4. Ingresar como paciente `90000001` con su correo/contraseña.
5. En **Autorizaciones**, autorizar por 1 hora, 24 horas o 7 días.
6. Cerrar sesión y entrar de nuevo como médica. Pulsar **Actualizar**.
7. Abrir **Visor clínico** y consultar el DNI autorizado; navegar por **Resumen**, **Atenciones**, **Exámenes**, **Tratamientos**, **Informes** y **Examen previo**.
8. Volver como paciente, revisar **Quién accedió** y **Revocar permiso**.
9. Entrar como médico y comprobar que una nueva solicitud del historial es rechazada. Si una vista quedó abierta, se oculta en la siguiente verificación (al volver a enfocar la pestaña o cada 15 s). Esto no puede borrar información ya vista o capturada.
10. Para demostrar continuidad parcial, seleccionar un origen simulado caído desde el visor médico y volver a consultar.

## Funciones realmente implementadas

- Portales diferenciados para médico y paciente, con rol en el servidor.
- Login con correo, contraseña y código CMP ficticio o DNI sintético; contraseñas derivadas mediante scrypt y sal individual.
- Sesiones aleatorias revocables, almacenadas en servidor, cookies HttpOnly, SameSite=Lax y Secure en producción.
- Límite básico de intentos fallidos por cuenta (5 intentos, 15 minutos), validación de Origin en métodos POST.
- Acceso a expedientes únicamente por el propio paciente o por el médico destinatario de una autorización vigente; comprobación en cada consulta.
- Solicitudes, aprobación, rechazo, vencimiento y revocación, con duración definida y bitácora de eventos.
- 24 pacientes sintéticos, 32 sedes referenciales SJL, 113 atenciones, 144 resultados y catálogo de 21 tipos de exámenes.
- Historial completo por atención: fecha/hora, sede, profesional ficticio, anamnesis, signos, diagnóstico, evaluación, plan, seguimiento, resultados y medicamentos.
- Filtros por texto, sede, tipo y períodos de 7, 30, 90, 180 y 365 días o todo el historial.
- Informe agrupado por atención en formato imprimible, unidades, muestras y referencias orientativas. No es PDF firmado ni documento médico original.
- Aviso de pruebas relacionadas y fuente de datos temporalmente no disponible, sin pretender que el estudio está clínicamente duplicado.
- Recursos FHIR R4 sintéticos internos y normalización de algunos códigos locales a LOINC.
- Endpoint clínico FHIR público del prototipo anterior ahora deshabilitado con HTTP 403.

## Limitaciones importantes respecto del plan maestro V2

| Tema | Situación de esta entrega | Para producción/piloto real |
|---|---|---|
| CMP/habilitación del médico | Campo CMP-DEMO y lista de profesionales ficticios preaprovisionados; **NO** se consulta CMP | Integración/validación oficial autorizada, vínculo laboral y recertificación de habilitación |
| Identidad del paciente | Cuentas sintéticas preaprovisionadas con DNI, correo y contraseña | Proceso de acreditación oficial, verificación de contacto, recuperación, MFA y representación legal |
| Persistencia | Archivo JSON local `.demo-state/portal.json`, acceso sincrónico para una sola instancia | PostgreSQL transaccional, concurrencia, backups, logs inmutables, gestión de llaves y acceso multiinstancia |
| Controles de autenticación | Hash scrypt y sesiones HttpOnly; **sin** MFA ni recuperación de cuenta | MFA, rotación de secretos, política de riesgo e integración con proveedor de identidad |
| Autorizaciones | Flujo de autorización educativa por destinatario, duración y finalidad | Evaluación regulatoria, excepciones legítimas, representantes, vínculos clínicos e interoperabilidad oficial |
| Integraciones | 3 redes de datos ficticios generados en la misma aplicación | APIs autorizadas, autenticación mutua, interoperabilidad con IPS/COREPE y pruebas de conformidad |
| Informes | Tablas sintetizadas y formato imprimible con datos de ejemplo | Documentos originales firmados, estados, revisión, validación de órdenes/resultados y paneles multiparámetro reales |
| Seguridad avanzada | Seguridad básica para demo, sin uso sanitario real | Pentest, threat modeling, OWASP ASVS, cifrado regulado, auditoría independiente, retención de datos, cumplimiento legal |
| Disponibilidad | Desarrollo local en un solo servidor | Infraestructura redundante, monitoreo, alta disponibilidad, DRP y SLA |
| Catálogo clínico | 21 exámenes, referencias docentes en `site/lib/catalogo-clinico.ts` | Laboratorios acreditados, referencias por método/sexo/edad, terminología validada y revisión médica |

**Esta entrega es la versión final funcional para la presentación académica, no un sistema clínico real listo para desplegar públicamente.** No exponer a internet ni usar con pacientes reales.

## Estructura de la versión V2

- `site/app/ingresar/` — autenticación (interfaz).
- `site/app/medico/` — portal médico con sesión y rol verificados.
- `site/app/paciente/` — portal del paciente.
- `site/app/api/portal/[accion]/route.ts` — API con autorización en servidor.
- `site/lib/server/auth.ts` — cuentas, sesiones, autorizaciones, auditoría y estado local.
- `site/lib/server/clinical.ts` — construcción del resumen a partir de fuentes FHIR ficticias.
- `site/components/portal/` — interfaz, historial, resultados e informes.
- `site/lib/data.ts`, `catalogo-clinico.ts`, `establecimientos-sjl.ts` — dataset y catálogos.
- `site/tests-v2.cjs` — pruebas de permisos y datos.
- `site/tests-smoke-sjl.cjs` — prueba de dataset.
- `PLAN_MAESTRO_V2_REFERENCIA.md` — plan original completo (documento de diseño, no prueba de implementación).

Las carpetas **`app/` (Python) y `web/` (versión estática)** del proyecto original se mantienen por compatibilidad histórica, pero **no implementan el acceso seguro V2 ni deben usarse para la demostración final**. Iniciar solo `site/`.

## Validación

Tras instalar las dependencias:

```powershell
cd site
npm run test:sjl
npm run test:v2
npm run build
```

Para las pruebas antiguas Python (opcionales):

```powershell
python -m pip install -r requirements.txt
python -m pytest -q
```

**En el entorno de edición:** pruebas SJL y V2 superadas, 11 tests Python superados y todos los archivos TS/TSX revisados sintácticamente. La compilación integral `npm run build` **no pudo ejecutarse** porque la instalación de dependencias npm no se completó. Debe comprobarse localmente; posibles errores de compilación deberán corregirse antes de desplegar.

## Documentación técnica y fuentes

- FHIR R4 `Encounter`: https://hl7.org/fhir/R4/encounter.html
- FHIR R4 `DiagnosticReport`: https://hl7.org/fhir/R4/diagnosticreport.html
- COREPE / IPS Perú (borrador; verificar actualización): https://dyaku.minsa.gob.pe/guides/index.html
- Colegio Médico del Perú, buscador público: https://conoceatumedico.cmp.org.pe/
- MedlinePlus (referencias clínicas varían por método/laboratorio): https://medlineplus.gov/spanish/pruebas-de-laboratorio/como-entender-sus-resultados-de-pruebas-de-laboratorio/
- ADA, Standards of Care 2026: https://diabetesjournals.org/care/issue/49/Supplement_1

No se suministran credenciales institucionales, datos clínicos reales ni conexión a fuentes oficiales.
