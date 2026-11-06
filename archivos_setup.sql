-- ARCHIVOS: el «Drive» de Smart Connect (Supabase Storage)
-- Ejecuta todo esto junto en el SQL Editor de Supabase.
-- Estructura: Guille | Alejandro / AAAA-MM-DD / archivos
-- Cada archivo se borra solo a los 14 días contando el de subida (lo hace la app y el comando de subida).

-- Espacio privado «contenido», hasta 50 MB por archivo
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('contenido', 'contenido', false, 52428800)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Políticas: las pone seguridad_rls.sql (ejecutarlo siempre al final). Nunca para anon.
