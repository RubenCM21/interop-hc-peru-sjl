# Plataforma SJL V2 · Sitio principal

**Ejecutar en Windows:**

```powershell
npm ci
npm run dev
```

Acceder a http://localhost:3000/ingresar con las cuentas ficticias indicadas en `../LEEME_PRIMERO_VERSION_FINAL.md`.

Pruebas: `npm run test:sjl`, `npm run test:v2`, `npm run build`.

No publicar ni utilizar con datos clínicos reales. `app/api/fhir` ya no expone datos clínicos anónimos; las fuentes sintéticas se usan internamente desde `lib/server/clinical.ts`. La persistencia de autorizaciones es un archivo local para una sola instancia, no un motor de datos sanitario transaccional.


## Publicación permanente con Supabase + Vercel

Ver `../GUIA_PUBLICACION_PERMANENTE.md` y ejecutar `db/01_schema.sql` y `db/02_seed_demo.sql`. Configurar `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `DEMO_ACCESS_CODE` en Vercel.
La web hospedada requiere la base de datos; sin ella no inicia sesión.
