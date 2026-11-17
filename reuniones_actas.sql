-- REUNIONES · ACTAS (17-11-2026)
-- Reuniones grabadas con la app de Mac «Reuniones ALDIA» (skill reuniones-aldia):
-- la app sube cada reunión con origen «Grabada», el acta en Markdown y la transcripción.
-- Solo añade columnas a una tabla que ya existe: la política «Solo equipo» sigue igual.

ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS acta TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS transcripcion TEXT;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS peticiones INTEGER;
ALTER TABLE reuniones ADD COLUMN IF NOT EXISTS clave_local TEXT;  -- carpeta de la reunión en el Mac (evita duplicados al volver a subir)
CREATE UNIQUE INDEX IF NOT EXISTS reuniones_clave_local_key ON reuniones (clave_local);

ALTER TABLE reuniones DROP CONSTRAINT IF EXISTS reuniones_origen_check;
ALTER TABLE reuniones ADD CONSTRAINT reuniones_origen_check CHECK (origen IN ('Calendly', 'Telefono', 'Otro', 'Grabada'));

NOTIFY pgrst, 'reload schema';
