# Historia clínica conectada · SJL · Prototipo académico V2

**Lee primero `LEEME_PRIMERO_VERSION_FINAL.md`**: explica instalación, credenciales, flujo médico-paciente, estructura, validación y límites de la demostración.

Aplicación principal: `site/` (Next.js). Abrir `http://localhost:3000/ingresar` tras `npm ci` y `npm run dev`.

Dos portales: médico con autorización del paciente y paciente con acceso propio, solicitudes, auditoría e historial por atenciones. Datos 100% ficticios atribuidos a sedes referenciales de San Juan de Lurigancho.

`PLAN_MAESTRO_V2_REFERENCIA.md` es el documento funcional original; la tabla de alcance implementado/pendiente está en `LEEME_PRIMERO_VERSION_FINAL.md`.

Las implementaciones antiguas `app/` (Python) y `web/` se conservan solo como legado: no usar para este flujo ni exponer a internet.
