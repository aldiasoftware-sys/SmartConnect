-- ARCHIVOS: el «Drive» de Smart Connect (Supabase Storage)
-- Ejecuta todo esto junto en el SQL Editor de Supabase.
-- Estructura: Guille | Alejandro / AAAA-MM-DD / archivos
-- Cada archivo se borra solo a los 14 días contando el de subida (lo hace la app y el comando de subida).

-- Espacio privado «contenido», hasta 50 MB por archivo
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('contenido', 'contenido', false, 52428800)
ON CONFLICT (id) DO UPDATE SET file_size_limit = EXCLUDED.file_size_limit;

-- Acceso compartido, igual que el resto de tablas de la app
DROP POLICY IF EXISTS "Aldia contenido acceso" ON storage.objects;
CREATE POLICY "Aldia contenido acceso" ON storage.objects
  FOR ALL TO anon, authenticated
  USING (bucket_id = 'contenido')
  WITH CHECK (bucket_id = 'contenido');

-- Que la app pueda comprobar que el espacio existe
DROP POLICY IF EXISTS "Aldia contenido ver espacio" ON storage.buckets;
CREATE POLICY "Aldia contenido ver espacio" ON storage.buckets
  FOR SELECT TO anon, authenticated
  USING (id = 'contenido');
