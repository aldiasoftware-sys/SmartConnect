-- =====================================================================
-- ALDIA SMART CONNECT · MINIBÓVEDAS DE CREDENCIALES
-- Ejecutar en Supabase → SQL Editor. Añade a cada credencial su bóveda
-- (Aldia, Guille, Millán, un cliente…). Sin esto la app ya funciona: guarda
-- la bóveda aparte en app_settings y la pasa a la columna al editar.
-- =====================================================================

ALTER TABLE credentials ADD COLUMN IF NOT EXISTS vault TEXT;
CREATE INDEX IF NOT EXISTS credentials_vault ON credentials (vault);
