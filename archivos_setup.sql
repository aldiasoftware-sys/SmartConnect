-- ARCHIVOS: el «Drive» de Smart Connect (Supabase Storage)
-- Ejecuta todo esto junto en el SQL Editor de Supabase.
-- Estructura: Guille | Alejandro / AAAA-MM-DD / archivos
-- Cada archivo se borra solo cuando pasan 3 días desde el de subida (lo hace la app y el comando de subida).

-- Espacio privado «contenido», hasta 50 MB por archivo
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('contenido', 'contenido', false, 52428800)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Políticas: las pone seguridad_rls.sql (ejecutarlo siempre al final). Nunca para anon.

-- Archivos → Calendario: cada pieza del calendario sabe de qué vídeo de Archivos sale
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS archivo TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS content_posts_archivo_red ON content_posts (archivo, platform) WHERE archivo IS NOT NULL;
