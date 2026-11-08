-- ============================================================
-- Discord (apartado Comunidad → Discord)
--   1. Foto diaria del servidor (la guarda /api/discord/snapshot cada noche)
--   2. Marca de «ya avisado en Discord» en las publicaciones del Calendario
-- Después ejecuta seguridad_rls.sql (aplica la política «Solo equipo» a la tabla nueva).
-- ============================================================
CREATE TABLE IF NOT EXISTS discord_snapshots (
  day          date PRIMARY KEY,
  members      integer NOT NULL DEFAULT 0,
  online       integer NOT NULL DEFAULT 0,
  messages_7d  integer NOT NULL DEFAULT 0,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS discord_notified_at timestamptz;
