-- HISTORIA CLÍNICA CONECTADA SJL V2 · ESQUEMA DE DEMOSTRACIÓN
-- Ejecutar UNA VEZ en Supabase Dashboard > SQL Editor; no usa historias clínicas reales.
CREATE TABLE IF NOT EXISTS public.portal_usuarios (
 id text PRIMARY KEY,
 role text NOT NULL CHECK(role IN ('medico','paciente')),
 nombre text NOT NULL,correo text NOT NULL UNIQUE,
 dni text UNIQUE,cmp text UNIQUE,establecimiento text,habilitacion text,
 salt text NOT NULL,hash text NOT NULL,
 intentos integer NOT NULL DEFAULT 0,bloqueado_hasta timestamptz
);
CREATE TABLE IF NOT EXISTS public.portal_sesiones (
 hash text PRIMARY KEY,
 user_id text NOT NULL REFERENCES public.portal_usuarios(id) ON DELETE CASCADE,
 expira timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_sesiones_user ON public.portal_sesiones(user_id);
CREATE TABLE IF NOT EXISTS public.portal_solicitudes (
 id text PRIMARY KEY,
 doctor_id text NOT NULL REFERENCES public.portal_usuarios(id),
 patient_id text NOT NULL REFERENCES public.portal_usuarios(id),
 dni text NOT NULL,finalidad text NOT NULL,
 estado text NOT NULL DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobada','rechazada','revocada')),
 creada timestamptz NOT NULL DEFAULT now(),decidida timestamptz,expira timestamptz
);
CREATE INDEX IF NOT EXISTS idx_portal_solicitudes_doctor ON public.portal_solicitudes(doctor_id,creada DESC);
CREATE INDEX IF NOT EXISTS idx_portal_solicitudes_patient ON public.portal_solicitudes(patient_id,creada DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_portal_solicitudes_unica_pendiente
 ON public.portal_solicitudes(doctor_id,patient_id) WHERE estado='pendiente';
CREATE TABLE IF NOT EXISTS public.portal_eventos (
 id text PRIMARY KEY,cuando timestamptz NOT NULL DEFAULT now(),
 actor_id text NOT NULL REFERENCES public.portal_usuarios(id),
 patient_id text REFERENCES public.portal_usuarios(id),
 solicitud_id text REFERENCES public.portal_solicitudes(id),
 accion text NOT NULL,detalle text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_portal_eventos_actor ON public.portal_eventos(actor_id,cuando DESC);
CREATE INDEX IF NOT EXISTS idx_portal_eventos_patient ON public.portal_eventos(patient_id,cuando DESC);

-- Solo el backend con clave secreta accede a estas tablas; un navegador no puede usar la anon key.
ALTER TABLE public.portal_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_sesiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_solicitudes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.portal_usuarios,public.portal_sesiones,public.portal_solicitudes,public.portal_eventos FROM anon,authenticated;
GRANT USAGE ON SCHEMA public TO service_role;
GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.portal_usuarios,public.portal_sesiones,public.portal_solicitudes,public.portal_eventos TO service_role;
