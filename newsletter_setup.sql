-- =====================================================================
-- NEWSLETTER «ALDIA Intelligence»
-- Ejecutar en Supabase → SQL Editor y DESPUÉS volver a ejecutar seguridad_rls.sql
-- (les pone la política «Solo equipo» a las tablas nuevas).
--
-- El público nunca toca estas tablas: el alta, la confirmación y la baja pasan por
-- las funciones de Cloudflare (functions/api/newsletter/*), que usan la clave secreta.
-- =====================================================================

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT,                                   -- web, tiktok, linkedin, FACTURAS (palabra clave), comunidad, manual…
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'activo', 'baja')),
  token UUID NOT NULL DEFAULT gen_random_uuid(), -- va en los enlaces de confirmar y darse de baja
  consent_text TEXT,                             -- prueba del consentimiento (RGPD)
  consent_at TIMESTAMPTZ,
  confirm_sent_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email ON newsletter_subscribers (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_token ON newsletter_subscribers (token);

CREATE TABLE IF NOT EXISTS newsletter_editions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER,
  subject TEXT NOT NULL DEFAULT '',
  preheader TEXT,
  intro TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,      -- bloques: noticia, automatización, herramienta, caso, recurso, nota
  cta JSONB,                                     -- { text, label, url }
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador', 'enviando', 'enviada')),
  planned_for DATE,
  sent_at TIMESTAMPTZ,
  recipients INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Un envío por edición y suscriptor: si un envío se corta (límite diario de Resend), se reanuda sin repetir.
CREATE TABLE IF NOT EXISTS newsletter_sends (
  edition_id UUID NOT NULL REFERENCES newsletter_editions (id) ON DELETE CASCADE,
  subscriber_id UUID NOT NULL REFERENCES newsletter_subscribers (id) ON DELETE CASCADE,
  resend_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (edition_id, subscriber_id)
);

ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_editions ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_sends ENABLE ROW LEVEL SECURITY;

-- Políticas: las pone seguridad_rls.sql (ejecutarlo ahora). Nunca para anon.
