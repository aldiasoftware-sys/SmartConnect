-- =====================================================================
-- ALDIA SMART CONNECT · PROYECTOS (sustituye a «Planificación»)
-- Ejecutar ENTERO en Supabase → SQL Editor. Se puede repetir sin duplicar nada.
-- Generado por scripts/proyectos_seed.py: si cambia el plan, editar allí y regenerar.
-- =====================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tablas ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE,
  name TEXT NOT NULL,
  client TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'planificado',  -- idea | planificado | en_curso | pausa | terminado
  color TEXT,
  owner TEXT,
  start_date DATE,
  end_date DATE,
  sort INTEGER DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,      -- áreas, principios, matriz de roles
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  area TEXT,
  kind TEXT NOT NULL DEFAULT 'tarea',           -- tarea | hito
  title TEXT NOT NULL,
  detail TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',     -- pendiente | en_curso | revision | esperando | hecho | descartado
  priority TEXT NOT NULL DEFAULT 'media',       -- alta | media | baja
  owner TEXT,
  waiting_on TEXT,
  start_date DATE,
  end_date DATE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  sort INTEGER DEFAULT 0,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_tasks_project_idx ON project_tasks(project_id);

CREATE TABLE IF NOT EXISTS project_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES project_tasks(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'nota',            -- nota | decision | pregunta | riesgo | reunion | analisis
  title TEXT,
  body TEXT NOT NULL,
  author TEXT,
  resolved BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS project_notes_project_idx ON project_notes(project_id);

-- 2. Seguridad: lo mismo que seguridad_rls.sql, solo para estas tres tablas
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['projects', 'project_tasks', 'project_notes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Solo equipo" ON public.%I', tbl);
    EXECUTE format('CREATE POLICY "Solo equipo" ON public.%I FOR ALL TO authenticated USING (public.is_team()) WITH CHECK (public.is_team())', tbl);
  END LOOP;
END $$;

-- 3. Lo que había en Planificación (gantt_items) pasa a un proyecto «Equipo ALDIA · Interno»
--    (gantt_items no se borra: se queda como copia)
DO $$
DECLARE pid UUID;
BEGIN
  IF to_regclass('public.gantt_items') IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM projects WHERE slug = 'aldia-interno') THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM gantt_items) THEN RETURN; END IF;
  INSERT INTO projects (slug, name, client, summary, status, color, owner, start_date, end_date, sort, meta)
  SELECT 'aldia-interno', 'Equipo ALDIA · Interno', 'ALDIA', 'Las tareas que había en Planificación.', 'en_curso', '#1e3a8a', 'Ambos',
         min(start_date), max(end_date), 2,
         jsonb_build_object('areas', (SELECT coalesce(jsonb_agg(DISTINCT jsonb_build_object('name', coalesce(category, 'Interno'),
           'color', CASE coalesce(category, 'Interno') WHEN 'Contenido' THEN '#fe2c55' WHEN 'Clientes' THEN '#0a66c2' WHEN 'Ventas' THEN '#12a26b' WHEN 'Producto' THEN '#e8590c' ELSE '#6c5ce7' END)), '[]'::jsonb) FROM gantt_items))
  FROM gantt_items
  RETURNING id INTO pid;
  INSERT INTO project_tasks (project_id, area, kind, title, detail, status, priority, owner, start_date, end_date, progress, done_at, created_at)
  SELECT pid, coalesce(category, 'Interno'), 'tarea', title, notes,
         CASE WHEN progress >= 100 THEN 'hecho' WHEN progress > 0 THEN 'en_curso' ELSE 'pendiente' END,
         'media', owner, start_date, end_date, progress, CASE WHEN progress >= 100 THEN now() END, created_at
  FROM gantt_items;
END $$;

-- 4. Plan «Renovación app F&T» (solo si aún no está cargado)
DO $$
DECLARE pid UUID;
BEGIN
  IF EXISTS (SELECT 1 FROM projects WHERE slug = 'ft-renovacion') THEN RETURN; END IF;
  INSERT INTO projects (slug, name, client, summary, status, color, owner, start_date, end_date, sort, meta) VALUES ('ft-renovacion', 'Renovación app F&T', 'Fun & Tickets', 'Control Center de F&T: un solo menú, roles nuevos, RRHH completo para el trabajador, reseñas dentro de la app, liquidaciones validadas, KPIs por área con PDF y mensajería tipo WhatsApp.', 'en_curso', '#e8590c', 'Guille', '2026-11-13', '2027-02-05', 1, '{"areas": [{"name": "Cimientos: roles, menú y legal", "color": "#1e3a8a", "start": "2026-11-13", "end": "2026-11-27", "goal": "Lo que todo lo demás necesita: roles nuevos, permisos por pestaña, un solo menú y la base legal."}, {"name": "RRHH", "color": "#12a26b", "start": "2026-11-23", "end": "2026-12-18", "goal": "Fichar al entrar, mis fichajes, documentos, ausencias y la vista administrativa reorganizada."}, {"name": "Reseñas y primas", "color": "#d6336c", "start": "2026-11-30", "end": "2026-12-18", "goal": "Todo dentro de la app de F&T, con predicción de guía por IA y una interfaz más viva."}, {"name": "Liquidaciones", "color": "#e8590c", "start": "2026-12-09", "end": "2026-12-23", "goal": "Precios, cuentas y ajustes cuadrados con la realidad y validados por Manu."}, {"name": "KPIs", "color": "#6c5ce7", "start": "2027-01-04", "end": "2027-01-15", "goal": "Cinco páginas de KPIs (reservas, liquidaciones, objetivos, reseñas, RRHH) exportables a PDF."}, {"name": "Mensajes", "color": "#0a66c2", "start": "2027-01-11", "end": "2027-01-22", "goal": "Chat multidispositivo tipo WhatsApp: notificaciones, adjuntos, grupos y respuestas rápidas."}, {"name": "Reservas, flota y ajustes", "color": "#0b7285", "start": "2027-01-18", "end": "2027-01-29", "goal": "Lavado de interfaz de Reservas y repaso de la maqueta 3D de la flota."}, {"name": "Lanzamiento", "color": "#0b1324", "start": "2027-01-25", "end": "2027-02-05", "goal": "Avisos a empleados, pruebas por rol, formación y despliegue."}, {"name": "A futuro", "color": "#8b95aa", "goal": "Ideas apuntadas sin fecha: se planifican cuando acabe la renovación."}], "matrix": {"title": "Roles y permisos", "intro": "Propuesta sacada del PDF. Cuando se cierre, se pasan los roles a los usuarios y después los permisos a cada pestaña. Las casillas «?» son contradicciones o huecos a decidir con Manu.", "cols": ["Admin", "Desarrollo", "RRHH", "Administración", "Guías", "Conductores"], "rows": [{"name": "Reservas (operativa)", "desc": "Reservas, salidas y flota del día", "cells": ["editar", "editar", "no", "ver", "ver", "ver"]}, {"name": "Liquidaciones y primas", "desc": "Tarifas, guías, sobres, ajustes y primas", "cells": ["editar", "editar", "editar", "no", "no", "no"]}, {"name": "Reseñas", "desc": "Responder, generar con IA y asignar guía", "cells": ["editar", "editar", "no", "editar", "no", "no"]}, {"name": "KPIs de reservas, liquidaciones y objetivos", "desc": "", "cells": ["ver", "ver", "?", "ver", "no", "no"]}, {"name": "KPIs de reseñas y vigilancia", "desc": "", "cells": ["ver", "ver", "no", "ver", "no", "no"]}, {"name": "KPIs de RRHH", "desc": "Ausencias, retrasos, días cumplidos", "cells": ["ver", "ver", "ver", "?", "no", "no"]}, {"name": "RRHH · vista trabajador", "desc": "Fichar, mis fichajes, documentos, ausencias. OBLIGATORIA para todos", "cells": ["propio", "propio", "propio", "propio", "propio", "propio"]}, {"name": "RRHH · vista administrativa", "desc": "Personal, cuadrante, solicitudes, documentos RRHH", "cells": ["editar", "editar", "editar", "no", "no", "no"]}, {"name": "Usuarios y Personal", "desc": "Cuentas de la app y ficha de todos los trabajadores", "cells": ["editar", "editar", "editar", "no", "no", "no"]}, {"name": "Mensajes", "desc": "Chat, grupos por departamento, contacto con clientes", "cells": ["editar", "editar", "?", "editar", "editar", "editar"]}, {"name": "Información propia", "desc": "Mis datos, mis guías asignadas, mis salidas", "cells": ["propio", "propio", "propio", "propio", "propio", "propio"]}, {"name": "Asistente IA", "desc": "«IA 100 % suya» en Admin", "cells": ["editar", "editar", "no", "no", "no", "no"]}, {"name": "Ajustes", "desc": "Revisión de que todos los números cuadren", "cells": ["editar", "editar", "?", "?", "no", "no"]}, {"name": "Stock (futuro)", "desc": "", "cells": ["editar", "editar", "no", "editar", "no", "no"]}], "foot": "Admin: acceso total a lo que le interese, a petición. Desarrollo: todo."}, "source": "PDF «Renovación app F&T» (lol+.pdf, 13-11-2026) contrastado con reservas-app (github-main)", "remarks": ["Leyes y temas jurídicos: a salvo de todo, siempre.", "Avisar a los empleados de todo lo que se les vaya a pedir y de los datos que se traten.", "Todo se hace desde la app de F&T: nada lleva a ALDIA Reviews ni a otra web.", "Un solo menú: ninguna sección tiene su propio menú lateral.", "La vista de trabajador de RRHH la tiene todo el mundo, sea cual sea su rol."]}'::jsonb) RETURNING id INTO pid;
  INSERT INTO project_tasks (project_id, area, kind, title, detail, status, priority, owner, waiting_on, start_date, end_date, progress, sort, done_at) VALUES
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Reunión de renovación y notas (PDF «Renovación app F&T»)', 'Notas de la reunión en ~/Desktop/lol+.pdf: 9 bloques + roles + avisos legales.', 'hecho', 'alta', 'Ambos', NULL, '2026-11-13', '2026-11-13', 100, 1, '2026-11-13 18:00+01'),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Contrastar el PDF con el código actual', 'Hecho el 13-11 sobre reservas-app (github-main). Resumen en Notas › Análisis.', 'hecho', 'alta', 'Guille', NULL, '2026-11-13', '2026-11-13', 100, 2, '2026-11-13 18:00+01'),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Subir a producción los 2 commits pendientes de github-main', 'e6490ee (Millán en Asistente y Primas) y b1f02d1 (copia diaria) van por delante de origin/main. Subirlos antes de abrir la renovación para no mezclar.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-16', '2026-11-16', 0, 3, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Arreglo rápido: el menú lateral hace scroll', '.sidebar tiene height:100vh y position:sticky sin overflow (src/styles/app.css:102-113): si no cabe, se corta. Añadir overflow-y:auto.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-16', '2026-11-16', 0, 4, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Arreglo rápido: centrar el contenido en pantallas anchas', '.main tiene max-width:1360px sin margin:auto (app.css:292-297), por eso los KPIs quedan pegados a la izquierda.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-16', '2026-11-16', 0, 5, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Cerrar la matriz de roles con Manu', 'Admin · Desarrollo · RRHH · Administración · Guías · Conductores. Propuesta en la pestaña Roles; resolver las casillas «?».', 'pendiente', 'alta', 'Ambos', 'Manu', '2026-11-16', '2026-11-20', 0, 6, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Pasar los roles actuales a los nuevos y asignar rol a cada usuario', 'Hoy: admin, operador, guia, lectura, empleado (src/lib/types.ts:98-117). Decidir a qué rol nuevo va cada uno.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-18', '2026-11-24', 0, 7, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Permisos por pestaña con los roles nuevos', 'Ampliar el sistema que ya existe (10 secciones con no/ver/editar, Ajustes › Permisos, Guard en App.tsx). «RRHH vista trabajador» obligatoria para todos.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-19', '2026-11-25', 0, 8, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Asistente y Primas por rol, no por lista de correos', 'ASISTENTE_EMAILS y PRIMAS_EMAILS están fijos y repetidos en types.ts, primas.sql y primas-asignar.mts.', 'pendiente', 'media', 'Guille', NULL, '2026-11-23', '2026-11-25', 0, 9, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Un solo menú: Reseñas y RRHH cuelgan del aside principal', 'Hoy cada una tiene su propio aside con «Volver a la app» (Shell.tsx:48-119). Pasan a ser grupos desplegables del menú principal.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-23', '2026-11-27', 0, 10, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', '«Equipo» se llama «Recursos humanos» (rol RRHH) o «Documentos» (resto)', NULL, 'pendiente', 'media', 'Guille', NULL, '2026-11-24', '2026-11-26', 0, 11, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'tarea', 'Base legal: información RGPD para empleados', 'Texto informativo de geolocalización al fichar (art. 90 LOPDGDD), documentos y datos que se tratan; revisar el registro de actividades de tratamiento con la asesoría de F&T.', 'pendiente', 'alta', 'Guille', 'Asesoría F&T', '2026-11-18', '2026-11-27', 0, 12, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'hito', 'Matriz de roles aprobada', NULL, 'pendiente', 'alta', 'Ambos', NULL, '2026-11-20', '2026-11-20', 0, 13, NULL),
    (pid, 'Cimientos: roles, menú y legal', 'hito', 'Menú único y roles nuevos en producción', NULL, 'pendiente', 'alta', 'Ambos', NULL, '2026-11-27', '2026-11-27', 0, 14, NULL),
    (pid, 'RRHH', 'tarea', 'Inicio: botón de fichar arriba del todo; hasta fichar no se ve lo demás', 'Hoy el fichaje (con zonas y mapa) vive en /fichar (src/pages/Fichar.tsx). Moverlo al Inicio y mantener debajo los paneles actuales.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-23', '2026-11-26', 0, 15, NULL),
    (pid, 'RRHH', 'tarea', 'Fichar como Oficina o Teletrabajo (Oficina por defecto)', 'El teletrabajo hoy solo existe como tipo de solicitud (src/lib/rrhh/tipos.ts:111).', 'pendiente', 'alta', 'Guille', NULL, '2026-11-23', '2026-11-25', 0, 16, NULL),
    (pid, 'RRHH', 'tarea', 'Avisos en Inicio: fuera de la oficina, boletín, cumpleaños y días importantes', 'El boletín de noticias se deja preparado y vacío de momento.', 'pendiente', 'media', 'Guille', NULL, '2026-11-25', '2026-11-30', 0, 17, NULL),
    (pid, 'RRHH', 'tarea', 'Mis fichajes: semana y mes, ajustes y banco de horas mensual', 'El saldo anual y la vista semana/mes ya existen. Falta el banco mensual y que cada ajuste quede registrado (quién, cuándo y por qué).', 'pendiente', 'alta', 'Guille', NULL, '2026-11-30', '2026-12-03', 0, 18, NULL),
    (pid, 'RRHH', 'tarea', 'Calendario personal: fichajes, días importantes y notas propias', 'Vista semanal y mensual.', 'pendiente', 'media', 'Guille', NULL, '2026-12-01', '2026-12-04', 0, 19, NULL),
    (pid, 'RRHH', 'tarea', 'Mis documentos y Documentos de la empresa en 7 carpetas', 'Contrato · cuestionarios · justificantes de ausencia · candidatura · modelo 145 · nóminas y onboarding · personales (DNI, NSS…). El reparto por DNI ya existe; falta ordenarlo así.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-30', '2026-12-04', 0, 20, NULL),
    (pid, 'RRHH', 'tarea', 'Ausencias y vacaciones: panel de días y de horas', 'Días generados / disponibles / usados; horas de ausencias puntuales generadas / disponibles / usadas; ausencias próximas, actuales y pasadas.', 'pendiente', 'alta', 'Guille', NULL, '2026-12-02', '2026-12-09', 0, 21, NULL),
    (pid, 'RRHH', 'tarea', 'Formulario de ausencia con 9 tipos y el horario de cada trabajador', 'Asuntos propios · enfermedad · enfermedad de un familiar · maternidad/paternidad · permiso puentes · viaje laboral · vacaciones · visita médica · otro. Varios días seguidos. Hoy descuenta festivos y avisa de solapes, pero NO comprueba el horario: no dejar pedir un sábado a quien no trabaja sábados.', 'pendiente', 'alta', 'Guille', NULL, '2026-12-03', '2026-12-09', 0, 22, NULL),
    (pid, 'RRHH', 'tarea', 'Datos personales: el trabajador pide el cambio y RRHH lo valida', 'Hoy solo RRHH edita la ficha y el empleado solo su foto.', 'pendiente', 'media', 'Guille', NULL, '2026-12-07', '2026-12-10', 0, 23, NULL),
    (pid, 'RRHH', 'tarea', 'KPI personal de desempeño', 'Rendimiento, puntualidad, horas. Empezar sencillo.', 'pendiente', 'baja', 'Guille', NULL, '2026-12-10', '2026-12-14', 0, 24, NULL),
    (pid, 'RRHH', 'tarea', 'Notificaciones de RRHH', 'Ausencia aprobada, documento nuevo (p. ej. nómina), cambios en tus datos. Primero dentro de la app; el push llega con Mensajes.', 'pendiente', 'alta', 'Guille', NULL, '2026-12-09', '2026-12-14', 0, 25, NULL),
    (pid, 'RRHH', 'tarea', 'Personal: registro de TODOS los trabajadores, usen o no la app', 'RRHH, Manu y Desarrollo meten, editan y borran sus documentos. Plantilla.tsx ya tiene fichas con foto: separar Personal de Usuarios.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-30', '2026-12-04', 0, 26, NULL),
    (pid, 'RRHH', 'tarea', 'Usuarios: solo RRHH, Manu y Desarrollo, con roles nuevos y fotos', NULL, 'pendiente', 'media', 'Guille', NULL, '2026-12-07', '2026-12-09', 0, 27, NULL),
    (pid, 'RRHH', 'tarea', 'Ficha de guía editable por RRHH o Manu con datos privados', 'Documentos fiscales y las mismas carpetas que ve el trabajador.', 'pendiente', 'media', 'Guille', NULL, '2026-12-09', '2026-12-11', 0, 28, NULL),
    (pid, 'RRHH', 'tarea', 'Documentos RRHH: envío privado o a todos, con aviso', 'A la carpeta de un trabajador o general (documento o post). A todos les llega la notificación de documento nuevo.', 'pendiente', 'alta', 'Guille', NULL, '2026-12-09', '2026-12-14', 0, 29, NULL),
    (pid, 'RRHH', 'tarea', 'Conectar Solicitudes con el formulario nuevo de ausencia', 'Solicitudes ya aprueba/rechaza con nota y admite adjunto.', 'pendiente', 'media', 'Guille', NULL, '2026-12-10', '2026-12-11', 0, 30, NULL),
    (pid, 'RRHH', 'tarea', 'Exportar a Excel el cuadrante y las ausencias', 'Ninguno de los dos exporta hoy (el registro de jornada sí).', 'pendiente', 'media', 'Guille', NULL, '2026-12-14', '2026-12-15', 0, 31, NULL),
    (pid, 'RRHH', 'tarea', 'Quitar Turnos', 'Decidido en la reunión.', 'pendiente', 'baja', 'Guille', NULL, '2026-12-14', '2026-12-14', 0, 32, NULL),
    (pid, 'RRHH', 'tarea', 'Quitar el listado general de Registro de jornada', 'Cada uno ve su registro en su perfil. OJO: el registro es obligatorio y se conserva 4 años; RRHH mantiene la exportación para la Inspección.', 'pendiente', 'media', 'Guille', NULL, '2026-12-14', '2026-12-15', 0, 33, NULL),
    (pid, 'RRHH', 'tarea', 'Plantilla: rehacer la cabecera y la interfaz', 'La funcionalidad está bien; arriba a la izquierda se ve pobre.', 'pendiente', 'media', 'Guille', NULL, '2026-12-15', '2026-12-17', 0, 34, NULL),
    (pid, 'RRHH', 'hito', 'RRHH renovado en producción', NULL, 'pendiente', 'alta', 'Ambos', NULL, '2026-12-18', '2026-12-18', 0, 35, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Reseñas 100 % dentro de la app de F&T', 'Detalle de la reserva, responder, generar con IA y publicar sin salir. Propuesta: ALDIA Reviews sigue siendo el motor (misma base de datos y extensión), la interfaz pasa a F&T.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-30', '2026-12-11', 0, 36, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Quitar el enlace a ALDIA Reviews del menú y de la cabecera', 'Shell.tsx:69-72 y Resenas.tsx:81.', 'pendiente', 'media', 'Guille', NULL, '2026-11-30', '2026-11-30', 0, 37, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Primas: al aceptar el guía de una reseña, que se le sume', 'Hoy la IA asigna directa y la corrección manual (manual:true, Primas.tsx:131-134) recalcula con lo guardado. Reproducir el caso en que no suma.', 'pendiente', 'alta', 'Guille', NULL, '2026-11-30', '2026-12-02', 0, 38, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Predicción de guía: botón rápido con el sugerido y el resto debajo', 'Si la IA cree que es de Óscar, sale «Óscar» destacado; los demás nombres siguen debajo por si se equivoca.', 'pendiente', 'alta', 'Guille', NULL, '2026-12-02', '2026-12-04', 0, 39, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Las reseñas atendidas cambian de color o se marcan «completada»', 'Hoy solo desaparecen del filtro «Dudosas».', 'pendiente', 'media', 'Guille', NULL, '2026-12-07', '2026-12-09', 0, 40, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Filtro «Hoy» para ir al día', 'Hoy hay 30/90 días/Todo en Reseñas y Dudosas/Con guía/Sin guía en Primas.', 'pendiente', 'media', 'Guille', NULL, '2026-12-07', '2026-12-07', 0, 41, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Interfaz de reseñas menos monótona', NULL, 'pendiente', 'media', 'Guille', NULL, '2026-12-07', '2026-12-11', 0, 42, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Reseñas › Guías con fotos reales y estrellas', 'Mismo estilo que Equipo › Guías. Las fotos ya están en el bucket rrhh-fotos (hoy en Reseñas sale el mismo dibujo para todos).', 'pendiente', 'media', 'Guille', NULL, '2026-12-09', '2026-12-11', 0, 43, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Registro de quién atiende cada reseña y cuándo', 'Lo necesita el KPI de vigilancia («cuántas reseñas no ha atendido hoy»).', 'pendiente', 'media', 'Guille', NULL, '2026-12-14', '2026-12-16', 0, 44, NULL),
    (pid, 'Reseñas y primas', 'tarea', 'Quitar Informes de Reseñas (pasan a KPIs)', NULL, 'pendiente', 'baja', 'Guille', NULL, '2026-12-16', '2026-12-16', 0, 45, NULL),
    (pid, 'Reseñas y primas', 'hito', 'Reseñas dentro de F&T', NULL, 'pendiente', 'alta', 'Ambos', NULL, '2026-12-18', '2026-12-18', 0, 46, NULL),
    (pid, 'Liquidaciones', 'tarea', 'Confirmar precios con Manu', 'Tarifas de autocar, autocar extra, van y tramos por plazas (Liquidaciones › Tarifas).', 'pendiente', 'alta', 'Guille', 'Manu', '2026-12-09', '2026-12-11', 0, 47, NULL),
    (pid, 'Liquidaciones', 'tarea', 'Comparar las cuentas con el entorno real', 'Excel de liquidación de Dropbox (/Pozo/Tours/<año>/<mes>) contra la app, mes a mes.', 'pendiente', 'alta', 'Guille', NULL, '2026-12-09', '2026-12-15', 0, 48, NULL),
    (pid, 'Liquidaciones', 'tarea', 'Guías: revisión a fondo, datos que faltan e interfaz', NULL, 'pendiente', 'media', 'Guille', 'Manu', '2026-12-14', '2026-12-17', 0, 49, NULL),
    (pid, 'Liquidaciones', 'tarea', 'Sobres: nueva interfaz con el gasto más detallado', NULL, 'pendiente', 'media', 'Guille', NULL, '2026-12-15', '2026-12-18', 0, 50, NULL),
    (pid, 'Liquidaciones', 'tarea', 'Ajustes: revisarlos con datos reales y que Manu los valide', NULL, 'pendiente', 'alta', 'Guille', 'Manu', '2026-12-16', '2026-12-22', 0, 51, NULL),
    (pid, 'Liquidaciones', 'tarea', 'Dar acceso a una persona que compruebe que todo cuadra', 'Del bloque Ajustes del PDF: alguien de F&T revisa ajustes y números.', 'pendiente', 'media', 'Guille', 'Manu', '2026-12-21', '2026-12-23', 0, 52, NULL),
    (pid, 'Liquidaciones', 'hito', 'Liquidaciones validadas por Manu', NULL, 'pendiente', 'alta', 'Ambos', NULL, '2026-12-23', '2026-12-23', 0, 53, NULL),
    (pid, 'KPIs', 'tarea', 'Decidir quién ve cada página de KPIs', 'Propuesta en la matriz de roles.', 'pendiente', 'alta', 'Guille', 'Manu', '2027-01-04', '2027-01-04', 0, 54, NULL),
    (pid, 'KPIs', 'tarea', 'KPIs de reservas: repaso de la página actual', NULL, 'pendiente', 'media', 'Guille', NULL, '2027-01-04', '2027-01-05', 0, 55, NULL),
    (pid, 'KPIs', 'tarea', 'KPIs de liquidaciones', NULL, 'pendiente', 'alta', 'Guille', NULL, '2027-01-05', '2027-01-07', 0, 56, NULL),
    (pid, 'KPIs', 'tarea', 'KPIs de objetivos: cómo va la cosa', 'Hacen falta los objetivos de F&T (los pone Manu).', 'pendiente', 'alta', 'Guille', 'Manu', '2027-01-06', '2027-01-08', 0, 57, NULL),
    (pid, 'KPIs', 'tarea', 'KPIs de reseñas y de vigilancia', 'Notas, volumen y, por persona, cuántas reseñas no ha atendido hoy.', 'pendiente', 'alta', 'Guille', NULL, '2027-01-08', '2027-01-12', 0, 58, NULL),
    (pid, 'KPIs', 'tarea', 'KPIs de RRHH (solo rol RRHH)', 'Ausencias, vacaciones, faltas, retrasos y días cumplidos.', 'pendiente', 'alta', 'Guille', NULL, '2027-01-11', '2027-01-14', 0, 59, NULL),
    (pid, 'KPIs', 'tarea', 'Exportar a PDF con el sistema de diseño de F&T', 'Hoy no existe (solo window.print en 3 pantallas). Pedir manual de marca o tomar colores y tipografía de la web.', 'pendiente', 'alta', 'Guille', 'Manual de marca F&T', '2027-01-11', '2027-01-14', 0, 60, NULL),
    (pid, 'KPIs', 'hito', 'KPIs completos con PDF', NULL, 'pendiente', 'alta', 'Ambos', NULL, '2027-01-15', '2027-01-15', 0, 61, NULL),
    (pid, 'Mensajes', 'tarea', 'Notificaciones push en todos los dispositivos', 'Web push en la PWA (public/sw.js no tiene push hoy). En iPhone solo funciona con la app añadida a pantalla de inicio (iOS 16.4+).', 'pendiente', 'alta', 'Guille', NULL, '2027-01-11', '2027-01-14', 0, 62, NULL),
    (pid, 'Mensajes', 'tarea', 'Adjuntos de todo tipo', 'Hoy solo texto de hasta 4000 caracteres (supabase/mensajes.sql:26).', 'pendiente', 'alta', 'Guille', NULL, '2027-01-12', '2027-01-14', 0, 63, NULL),
    (pid, 'Mensajes', 'tarea', 'Grupos por departamento', 'Los grupos ya existen; crearlos solos según rol.', 'pendiente', 'media', 'Guille', NULL, '2027-01-14', '2027-01-15', 0, 64, NULL),
    (pid, 'Mensajes', 'tarea', 'Guías: llamar o escribir por WhatsApp a sus clientes asignados', 'Solo los de su subgrupo y el día del servicio (datos personales de clientes: RGPD).', 'pendiente', 'media', 'Guille', NULL, '2027-01-15', '2027-01-19', 0, 65, NULL),
    (pid, 'Mensajes', 'tarea', 'Plantillas de respuesta rápida', NULL, 'pendiente', 'media', 'Guille', NULL, '2027-01-18', '2027-01-19', 0, 66, NULL),
    (pid, 'Mensajes', 'tarea', 'Interfaz lo más parecida a WhatsApp', NULL, 'pendiente', 'media', 'Guille', NULL, '2027-01-18', '2027-01-22', 0, 67, NULL),
    (pid, 'Mensajes', 'hito', 'Mensajes 2.0', NULL, 'pendiente', 'alta', 'Ambos', NULL, '2027-01-22', '2027-01-22', 0, 68, NULL),
    (pid, 'Reservas, flota y ajustes', 'tarea', 'Reservas: lavado de interfaz', NULL, 'pendiente', 'media', 'Guille', NULL, '2027-01-18', '2027-01-22', 0, 69, NULL),
    (pid, 'Reservas, flota y ajustes', 'tarea', 'Flota: repaso a fondo de la maqueta 3D', 'Mejorar la experiencia; comprobar que todo funciona.', 'pendiente', 'media', 'Guille', NULL, '2027-01-19', '2027-01-22', 0, 70, NULL),
    (pid, 'Reservas, flota y ajustes', 'tarea', 'Flota: mejoras del autocar y prueba completa', 'La cabina del autocar está bastante bien; pulir.', 'pendiente', 'baja', 'Guille', NULL, '2027-01-25', '2027-01-27', 0, 71, NULL),
    (pid, 'Reservas, flota y ajustes', 'tarea', 'Ajustes y Ayuda: actualizar la ayuda a los cambios', 'Se quedan como están; solo actualizar los textos de ayuda.', 'pendiente', 'baja', 'Guille', NULL, '2027-01-27', '2027-01-29', 0, 72, NULL),
    (pid, 'Lanzamiento', 'tarea', 'Avisar a los empleados de lo que se les va a pedir y de los datos que se tratan', 'Aviso previo y por escrito, con el texto de la base legal.', 'pendiente', 'alta', 'Ambos', NULL, '2027-01-25', '2027-01-27', 0, 73, NULL),
    (pid, 'Lanzamiento', 'tarea', 'Pruebas completas entrando con cada rol', 'Admin, Desarrollo, RRHH, Administración, Guía y Conductor; en móvil y ordenador.', 'pendiente', 'alta', 'Guille', NULL, '2027-01-25', '2027-01-29', 0, 74, NULL),
    (pid, 'Lanzamiento', 'tarea', 'Formación y guía rápida por rol', NULL, 'pendiente', 'media', 'Ambos', NULL, '2027-01-27', '2027-02-02', 0, 75, NULL),
    (pid, 'Lanzamiento', 'tarea', 'Despliegue y seguimiento de la primera semana', NULL, 'pendiente', 'alta', 'Guille', NULL, '2027-02-01', '2027-02-05', 0, 76, NULL),
    (pid, 'Lanzamiento', 'hito', 'App de F&T renovada', NULL, 'pendiente', 'alta', 'Ambos', NULL, '2027-02-05', '2027-02-05', 0, 77, NULL),
    (pid, 'A futuro', 'tarea', 'Chatbot en Mensajes', NULL, 'pendiente', 'baja', 'Guille', NULL, NULL, NULL, 0, 78, NULL),
    (pid, 'A futuro', 'tarea', 'Buzones de correo redirigidos a la app', NULL, 'pendiente', 'baja', 'Guille', NULL, NULL, NULL, 0, 79, NULL),
    (pid, 'A futuro', 'tarea', 'Stock (rol Administración)', NULL, 'pendiente', 'baja', 'Guille', NULL, NULL, NULL, 0, 80, NULL);
  INSERT INTO project_notes (project_id, kind, title, body, author, pinned, created_at) VALUES
    (pid, 'reunion', 'Reunión de renovación · 13 nov', 'Repaso de toda la app con F&T. Bloques: Reservas, Liquidaciones, KPI, Reseñas/Primas, Mensajes, RRHH, Ajustes, Roles y avisos legales. El PDF original está en el Escritorio (lol+.pdf); todo lo que dice está repartido en Tareas y en la pestaña Roles.', 'Guille', TRUE, '2026-11-13 19:00+01'::timestamptz + interval '17 seconds'),
    (pid, 'analisis', 'Contraste con la app actual (13 nov)', 'Mucho de lo pedido ya existe y es REORGANIZAR, no construir:
• RRHH: fichaje con zonas y mapa, saldo de horas, documentos con reparto por DNI, ausencias con convenio y festivos, solicitudes, cuadrante, registro de jornada con Excel, ajustes y ayuda.
• Liquidaciones: guías, sobres, tarifas configurables, ajustes por salida y cierre de mes. La rama liquidaciones-v5 ya está desplegada.
• Roles: ya hay permisos por pestaña (10 secciones, no/ver/editar). Se amplía, no se rehace.
• Mensajes: chat en tiempo real con grupos y no leídos.

Lo que NO existe: exportar a PDF (KPIs), notificaciones push, adjuntos y plantillas en el chat, exportar cuadrante y ausencias a Excel, validar ausencias con el horario de cada uno, fichar como teletrabajo, filtro «Hoy» en reseñas y fotos reales en Reseñas › Guías.

Problemas detectados: el menú no hace scroll (falta overflow), el contenido no se centra (falta margin:auto) y github-main va 2 commits por delante de producción.', 'Guille', TRUE, '2026-11-13 19:00+01'::timestamptz + interval '16 seconds'),
    (pid, 'analisis', 'Por qué este orden', '1) Roles y menú primero: RRHH, KPIs, Reseñas y Mensajes dependen de quién ve qué.
2) RRHH antes que KPIs: el KPI de RRHH sale de sus datos.
3) Reseñas: el registro de quién atiende cada reseña alimenta el KPI de vigilancia.
4) Liquidaciones en diciembre porque depende de Manu (precios y ajustes).
5) KPIs en enero, cuando ya hay datos de todo.
6) Mensajes después: el push sirve también para los avisos de RRHH.
Del 24 dic al 3 ene no hay nada planificado.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '15 seconds'),
    (pid, 'riesgo', 'Registro de jornada: es obligatorio', 'Quitar el listado general está bien, pero la empresa debe guardar el registro 4 años y enseñarlo a la Inspección y a la representación de los trabajadores (art. 34.9 ET). RRHH conserva la exportación y cada ajuste de fichaje deja rastro de quién, cuándo y por qué.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '14 seconds'),
    (pid, 'riesgo', 'Geolocalización al fichar', 'Solo en el momento de fichar, nunca seguimiento continuo, e informando antes y por escrito (art. 90 LOPDGDD). Encaja con la nota del PDF: avisar a los empleados de todo lo que se les vaya a pedir.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '13 seconds'),
    (pid, 'riesgo', 'Teléfonos de clientes en manos de los guías', 'Llamar o escribir por WhatsApp solo a los clientes asignados y el día del servicio; sin exportar ni copiar listados. Si no, es una cesión de datos difícil de justificar.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '12 seconds'),
    (pid, 'riesgo', 'Push en iPhone', 'Las notificaciones web solo llegan en iPhone si la app está añadida a la pantalla de inicio (iOS 16.4 o posterior). Hay que explicarlo en la formación.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '11 seconds'),
    (pid, 'pregunta', 'Rol Admin: «a petición, IA 100 % suya»', '¿Quién es Admin (Manu, Millán…)? ¿Qué quiere decir «IA 100 % suya»: el Asistente solo para él, o una IA con acceso a todo?', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '10 seconds'),
    (pid, 'pregunta', 'Manu: ¿Admin o RRHH?', 'El PDF repite «RRHH o Manu» en Usuarios, Personal y Guías. Si Manu es Admin, ya lo ve todo; confirmar.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '9 seconds'),
    (pid, 'pregunta', 'Administración ve «KPIs todos», pero los de RRHH son solo para RRHH', 'Contradicción en el PDF. Propuesta: Administración ve todos los KPIs menos los de RRHH.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '8 seconds'),
    (pid, 'pregunta', '¿Mensajes para el rol RRHH?', 'El PDF no se lo da a RRHH, pero sí a guías, conductores y administración. Lo lógico es que lo tengan todos.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '7 seconds'),
    (pid, 'pregunta', '¿A qué rol pasan operador, lectura y empleado?', 'Los roles de hoy no coinciden con los nuevos. Hace falta la lista de usuarios con su rol nuevo.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '6 seconds'),
    (pid, 'pregunta', 'Reseñas sin ALDIA Reviews: ¿solo la interfaz o todo?', 'Propuesta: ALDIA Reviews sigue siendo el motor (misma base de datos, extensión y publicación) y la app de F&T solo cambia la puerta. Rehacer el motor en F&T sería duplicar trabajo.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '5 seconds'),
    (pid, 'pregunta', '¿Cuántas horas de ausencias puntuales genera el convenio?', 'Necesario para el panel de horas generadas / disponibles / usadas.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '4 seconds'),
    (pid, 'pregunta', 'Stock (rol Administración)', '¿Qué stock es: material, entradas, merchandising? Queda en «A futuro» hasta saberlo.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '3 seconds'),
    (pid, 'pregunta', 'Sistema de diseño de F&T para los PDF', '¿Hay manual de marca (colores, tipografías, logotipos)? Si no, se toma de la web.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '2 seconds'),
    (pid, 'decision', 'Decidido en la reunión', '• Turnos fuera.
• El registro de jornada como listado general fuera: cada uno lo ve en su perfil.
• Ajustes y Ayuda de RRHH se quedan como están.
• Usuarios (cuentas de la app) y Personal (todos los trabajadores) son cosas distintas.
• La vista de trabajador de RRHH la tiene todo el mundo.
• Informes de reseñas pasan a KPIs.', 'Guille', FALSE, '2026-11-13 19:00+01'::timestamptz + interval '1 seconds');
END $$;

-- 5. Comprobación
SELECT p.name, count(t.id) AS tareas, (SELECT count(*) FROM project_notes n WHERE n.project_id = p.id) AS notas
FROM projects p LEFT JOIN project_tasks t ON t.project_id = p.id GROUP BY p.id, p.name ORDER BY p.sort;
