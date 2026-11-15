-- =====================================================================
-- ALDIA SMART CONNECT · CONTADOR DE COMUNIDAD
-- Ejecutar en Supabase → SQL Editor. Después, volver a ejecutar seguridad_rls.sql
-- (deja la tabla en «Solo equipo» como las demás).
-- No guarda datos de nadie: una fila = una persona nueva en la comunidad ese día.
-- =====================================================================

CREATE TABLE IF NOT EXISTS community_joins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  joined_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS community_joins_joined_on ON community_joins (joined_on);

ALTER TABLE community_joins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Solo equipo" ON community_joins;
CREATE POLICY "Solo equipo" ON community_joins
  FOR ALL TO authenticated
  USING (public.is_team())
  WITH CHECK (public.is_team());
