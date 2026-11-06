-- =====================================================================
-- ALDIA SMART CONNECT · SEGURIDAD (sustituye las políticas «Global Shared Access»)
-- Ejecutar ENTERO en Supabase → SQL Editor, DESPUÉS de los otros .sql.
--
-- Antes: cualquiera con la clave pública (va en el JavaScript de la web) podía
-- leer y escribir todas las tablas, credenciales incluidas.
-- Ahora: solo usuarios con sesión iniciada Y cuyo email esté en team_access.
--
-- Emails del equipo en el paso 1 (Guille = aldiasoftware@gmail.com, Millán)
-- (los mismos con los que se crearán las cuentas en Authentication → Users).
-- =====================================================================

-- 1. Lista de acceso del equipo (nadie puede leerla ni tocarla desde la web)
CREATE TABLE IF NOT EXISTS team_access (
  email TEXT PRIMARY KEY
);
ALTER TABLE team_access ENABLE ROW LEVEL SECURITY;

INSERT INTO team_access (email) VALUES
  ('aldiasoftware@gmail.com'),
  ('alexmiher2017@gmail.com')
ON CONFLICT DO NOTHING;

-- 2. ¿El usuario de la petición es del equipo?
CREATE OR REPLACE FUNCTION public.is_team()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_access
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
REVOKE ALL ON FUNCTION public.is_team() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team() TO authenticated;

-- 3. En TODAS las tablas de public: borrar políticas viejas, activar RLS
--    y dejar una sola política «solo equipo» (team_access se queda sin políticas).
DO $$
DECLARE
  pol RECORD;
  tbl RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;

  FOR tbl IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'team_access' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl.tablename);
    EXECUTE format(
      'CREATE POLICY "Solo equipo" ON public.%I FOR ALL TO authenticated USING (public.is_team()) WITH CHECK (public.is_team())',
      tbl.tablename
    );
  END LOOP;
END $$;

-- 4. Formulario de contacto de la web: puede DEJAR mensajes sin login, pero no leerlos.
--    (Si la web no escribe en contact_messages, este bloque no molesta.)
GRANT INSERT ON public.contact_messages TO anon;
CREATE POLICY "Web puede enviar mensajes" ON public.contact_messages
  FOR INSERT TO anon
  WITH CHECK (estado = 'sin responder');

-- 5. Archivos (Supabase Storage, espacio «contenido»): solo el equipo, nada para anon.
--    (Si el espacio aún no existe, estas políticas no molestan.)
DROP POLICY IF EXISTS "Aldia contenido acceso" ON storage.objects;
DROP POLICY IF EXISTS "Aldia contenido ver espacio" ON storage.buckets;
DROP POLICY IF EXISTS "Aldia contenido solo equipo" ON storage.objects;
DROP POLICY IF EXISTS "Aldia contenido ver espacio equipo" ON storage.buckets;
CREATE POLICY "Aldia contenido solo equipo" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'contenido' AND public.is_team())
  WITH CHECK (bucket_id = 'contenido' AND public.is_team());
CREATE POLICY "Aldia contenido ver espacio equipo" ON storage.buckets
  FOR SELECT TO authenticated
  USING (id = 'contenido' AND public.is_team());

-- 6. Comprobación: debe salir «Solo equipo» en cada tabla (y la de mensajes web en contact_messages)
SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
