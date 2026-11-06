# Aldia Smart Connect

Panel interno de ALDIA Project, organizado como el *Roadmap de arranque*: atraer (contenido) → capturar y nutrir (comunidad) → convertir (comercial) → SaaS.

| Sección | Qué lleva |
| --- | --- |
| **Esta semana** | El embudo con cifras reales, el contenido de la semana, quién espera respuesta (regla de 24 h) y lo siguiente. |
| **Contenido · Calendario** | Semana tipo (Noticia IA, Automatización, Tutorial y Caso real en TikTok; caso y pregunta del viernes en LinkedIn), estados Idea → Guion → Voz → Montado → Publicado y banco de ideas. |
| **Contenido · Redes** | Seguidores semana a semana (check-in de cada lunes) y cumplimiento del mínimo: 3 TikToks y 2 posts de LinkedIn. |
| **Comunidad** | Leads y contactos, la escalera de seis pasos, de dónde viene la gente y el hito para abrir Skool. |
| **Comercial · Ofertas** | Los tres escalones (Diagnóstico ALDIA Óptima, Servicio portfolio, Mantenimiento), los 10 diagnósticos para validar precios y los patrones que pueden acabar en SaaS. |
| **Equipo** | Tareas, Planificación (Gantt), Equipo, Suscripciones y Credenciales. |

## Puesta en marcha

1. `npm install`
2. Crea `.env.local` con las claves de Supabase (no se sube al repositorio):
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_EMAIL_GUILLE=...
   NEXT_PUBLIC_EMAIL_MILLAN=...
   ```
3. En el SQL Editor de Supabase ejecuta `supabase_setup.sql`, `reuniones_setup.sql`, `setup_contact_messages.sql`, `redes_setup.sql` y, **siempre al final**, `seguridad_rls.sql` (con los emails del equipo puestos).
   Crea las cuentas en Authentication → Users (no hay registro en la app) y desactiva «Allow new users to sign up».
   Si una tabla nueva aún no existe, esa sección guarda en el navegador y lo sube sola cuando la tabla aparece.
4. `npm run dev` → http://localhost:3000

## Publicar

`npx next build` genera la web estática en `out/` (todo funciona en el navegador contra Supabase). Esa carpeta se sube tal cual a Cloudflare Pages.

> Acceso con login de Supabase y RLS «solo equipo» en todas las tablas (ver `seguridad_rls.sql`). Sin sesión la base no devuelve nada.
