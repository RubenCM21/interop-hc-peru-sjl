# Interop HC Perú SJL V2 — Publicación permanente (Vercel + Supabase)

> **Solo demostración académica** · Datos sintéticos · No conectado a Minsa, EsSalud, CMP, RENIEC o RENHICE.
> **No publicar datos reales** ni reutilizar esto como software asistencial.

## ¿Qué cambió frente a la V2 anterior?

- Se reemplazó `site/lib/server/auth.ts`, que guardaba `site/.demo-state/portal.json`, por persistencia en **PostgreSQL de Supabase** mediante su API REST, invocada **exclusivamente desde Next.js en el servidor**.
- Usuarios, contraseñas con scrypt/salt, sesiones (solo hash del token), solicitudes, autorizaciones, revocaciones y auditoría quedan persistidos en PostgreSQL. Sobreviven a reinicios y nuevos despliegues de la web.
- Se mantiene autorización por paciente + médico + duración y comprobación por cada consulta.
- Se bloquea la lectura de historial mediante el endpoint FHIR abierto, y el visor antiguo redirige al portal.
- Se agregó **código de invitación privado** (`DEMO_ACCESS_CODE`), obligatorio para una demo abierta en internet, que protege las credenciales compartidas de la exposición.
- Se conservan los 24 pacientes, 32 sedes, 21 exámenes, 113 atenciones y 144 resultados sintéticos de la V2.
- **Las historias sintéticas siguen generándose en código, no en la BD**. Solo identidad demo, sesiones, consentimientos y auditoría utilizan PostgreSQL. Los cambios médicos no son editables desde los portales.

## 1. Extraer el ZIP y preparar el repositorio

Descomprime el ZIP y abre la carpeta `interop-hc-peru-main` en VS Code.

Si vas a crear un repositorio nuevo en GitHub, sube **el contenido de esa carpeta** como raíz, incluyendo `site/`, `app/`, `web/` y los archivos de documentación. En Vercel luego seleccionarás `site` como **Root Directory**.

Si quieres reemplazar tu repositorio anterior, usa una rama o haz copia de seguridad antes de sobrescribir los archivos existentes. Nunca subas `.env.local`, `.env` ni claves privadas.

## 2. Crear la base de datos Supabase

1. Ve a https://supabase.com/dashboard y crea un proyecto nuevo **solo para datos ficticios**.
2. Espera a que la base de datos esté disponible. Abre **SQL Editor → New query**.
3. Pega y ejecuta todo el contenido de `site/db/01_schema.sql`.
4. Crea una segunda consulta SQL; pega y ejecuta `site/db/02_seed_demo.sql`.
5. En **Table Editor**, comprueba que `portal_usuarios` tiene **26 cuentas** (2 médicos, 24 pacientes). Las tablas `portal_sesiones`, `portal_solicitudes` y `portal_eventos` comienzan vacías.
6. Ve a **Project Settings → API Keys** y copia **Secret key** de servidor (`sb_secret_...`). Copia además la **Project URL** (`https://xxxxxxxx.supabase.co`). Los nombres de menús pueden cambiar; busca “API Keys” y “Project URL”.

> Los scripts son idempotentes: `01_schema.sql` usa `IF NOT EXISTS` y `02_seed_demo.sql` usa `ON CONFLICT DO NOTHING`. No restablecen credenciales ni borran solicitudes anteriores. No ejecutes el seed en una BD que contenga personas reales.

### Tablas

- `portal_usuarios`: cuentas ficticias, función, identificador, hash/salt, intentos y bloqueo.
- `portal_sesiones`: identificador de sesión con hash SHA-256 y vencimiento.
- `portal_solicitudes`: relación médico-paciente, finalidad, decisión, caducidad.
- `portal_eventos`: registro de accesos y decisiones. No almacena resultados médicos.

RLS está habilitado y el acceso anónimo/autenticado directo a estas tablas está revocado. **El backend utiliza una clave secreta de alta confianza que omite RLS:** debe mantenerse exclusivamente del lado servidor. Las reglas por usuario se verifican en Next.js.

## 3. Configurar variables de entorno (LOCAL)

Dentro de `site/` copia `.env.example` a `.env.local` (Windows PowerShell):

```powershell
cd site
Copy-Item .env.example .env.local
```

Edita `.env.local` y reemplaza los valores:

```dotenv
SUPABASE_URL=https://ID-REAL-DEL-PROYECTO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_TU_CLAVE_REAL
DEMO_ACCESS_CODE=UN-CODIGO-LARGO-PRIVADO-Y-ALEATORIO
```

**No compartas ni publiques estas variables.** El código privado de invitación se comparte por separado solo con docentes y compañeros que realizarán la prueba.

Ejecuta:

```powershell
npm ci
npm run dev
```

Abre `http://localhost:3000/ingresar`. En el formulario tendrás que introducir también el código de invitación.

## 4. Publicar el sitio en Vercel (enlace estable)

1. Sube el proyecto a tu repositorio GitHub: https://github.com/new
2. Entra a https://vercel.com/new e inicia sesión con tu cuenta de GitHub.
3. Selecciona **Add New → Project**, importa el repositorio.
4. **IMPORTANTE: Root Directory = `site`** (si el repositorio contiene `site/` en la raíz). Framework Preset: **Next.js**.
5. Deja Build Command `npm run build` e Install Command `npm ci`, o usa los valores autodetectados por Next.js.
6. Antes de desplegar, en **Environment Variables** agrega `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `DEMO_ACCESS_CODE`. Márcalas para **Production**; si usarás Preview también, configúralas allí con cuidado de evitar despliegues expuestos.
7. Haz clic en **Deploy**. Si el build concluye, Vercel te proporcionará un dominio `https://NOMBRE-UNICO.vercel.app`. **No puedes conocer ni reservar la URL exacta hasta crear el proyecto**.
8. En `Project → Settings → Domains` puedes añadir un dominio comprado si lo deseas. El subdominio `*.vercel.app` no exige comprar dominio.
9. Ejecuta el circuito de prueba siguiente desde **dos navegadores/perfiles diferentes**.

Cada push a la rama de producción conectada actualizará la web sin borrar las cuentas o autorizaciones guardadas en Supabase.

### Asegurar el sitio

- **Recomendado**: Vercel → Security → Deployment Protection → **All Deployments** con Vercel Authentication; restringe el acceso a miembros/invitados autorizados. Si seleccionas esta opción, los evaluadores necesitarán también acceso Vercel.
- Si necesitas mostrar la web mediante enlace público a personas sin cuenta de Vercel, limita su difusión, conserva `DEMO_ACCESS_CODE` privado, usa solo datos sintéticos y considera que **no es una seguridad certificada**.
- No compartas `SUPABASE_SECRET_KEY`; nunca utilices `NEXT_PUBLIC_SUPABASE_SECRET_KEY`.
- En el repositorio, activa protección de rama y escaneo de secretos cuando esté disponible.

### Disponibilidad en planes gratuitos

La URL de Vercel es estable mientras exista el proyecto, pero no garantiza servicio continuo. **Supabase Free puede pausar la base de datos después de aproximadamente siete días con baja actividad**. Para disponibilidad continua, utiliza un plan sin pausas automáticas o verifica el proyecto antes de tu presentación. Ver documentación oficial de Supabase.

## 5. Cuentas para la exposición

| Perfil | Identificador | Correo | Contraseña demo |
|---|---|---|---|
| Médico | `CMP-DEMO-001` | `medico.demo@sjl.test` | `DemoMedico2026!` |
| Médico alterno | `CMP-DEMO-002` | `medico2.demo@sjl.test` | `DemoMedico2026!` |
| Paciente | `90000001` | `paciente01@demo.sjl.test` | `DemoPaciente2026!` |
| Paciente alterno | `90000002` | `paciente02@demo.sjl.test` | `DemoPaciente2026!` |

Para cada cuenta necesitas también **el mismo código de invitación privado del despliegue**. Las cuentas solo funcionan con pacientes sintéticos; la colegiatura CMP es ficticia.

### Circuito de verificación de persistencia

1. Entra como médico (`CMP-DEMO-001`), solicita acceso al DNI `90000001`, con una finalidad de al menos 10 caracteres.
2. Cierra sesión; ingresa como paciente `90000001` y aprueba por 1 hora o 24 horas.
3. Regresa al médico, busca la solicitud autorizada, consulta el expediente y revisa la auditoría.
4. Cierra sesión y vuelve a abrir el sitio desde otra ventana o incluso otro dispositivo: **el permiso se conserva hasta su caducidad**, ya que está en la BD.
5. Entra como paciente, revoca la autorización; vuelve al médico y comprueba que no permite consultar.
6. Con el médico alterno (`CMP-DEMO-002`), comprueba que **no hereda** el permiso dado al primer médico.
7. Comprueba que `GET /api/fhir/minsa/Patient` devuelve **403**.

## 6. Pruebas técnicas

```powershell
cd site
npm ci
npm run test:sjl
npm run test:v2
npm run build
```

`test:v2` simula operaciones PostgREST localmente para confirmar que la lógica de permisos funciona, **sin tocar tu Supabase**.

**Limitaciones de validación:** por falta de acceso a tus credenciales y por no poder descargar paquetes npm en el entorno de construcción, no se ha realizado un despliegue real en Vercel ni una prueba conectada a una instancia Supabase auténtica, ni un build final de Next.js. Se han ejecutado las pruebas locales de simulación y se han comprobado la sintaxis y el código fuente.

## 7. Límites y pasos para una plataforma real

- No hay validación auténtica de identidad civil, CMP o vínculo con instituciones. El DNI es solo un identificador de prueba.
- No existe MFA institucional ni procedimiento de recuperación de cuentas ni proceso de alta de usuarios nuevos desde la interfaz. Las 26 cuentas sintéticas fueron precargadas.
- El modelo de sesiones y contraseñas es de prototipo; todavía requiere auditoría profesional de seguridad, control distribuido de solicitudes, mayor protección contra abuso, monitoreo y revisión de privacidad.
- El modelo FHIR es un simulador; no está conectado a RENHICE, SIHCE, EsSalud ESSI ni clínicas reales. Las sedes son referencias nominales.
- Los valores médicos y referencias son orientativos, no decisiones de diagnóstico. No puede utilizarse para tratar pacientes reales.
- Registros clínicos y exámenes están integrados en código y no se editan ni persisten en Supabase; únicamente se persisten identidades, sesiones, autorizaciones y auditoría.
- El registro de auditoría no es inmutable ni está certificado bajo una norma de auditoría clínica.
- Para producción real se requieren seguridad, normas, diseño médico y legal, integración oficial y evaluación de cumplimiento.

## Recursos oficiales

- Vercel: https://vercel.com/docs/git
- Vercel Deployment Protection: https://vercel.com/docs/deployment-protection
- Supabase API Keys: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase REST: https://supabase.com/docs/guides/api/creating-routes
- Supabase Free y pausing: https://supabase.com/docs/guides/platform/free-project-pausing
