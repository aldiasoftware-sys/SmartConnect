-- REDES SOCIALES + PLANIFICACIÓN (GANTT)
-- Ejecuta todo esto junto en el SQL Editor de Supabase.

-- Seguidores de cada cuenta, uno por semana (la semana empieza en lunes)
CREATE TABLE IF NOT EXISTS social_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  account TEXT NOT NULL,          -- 'linkedin_guille' | 'linkedin_millan' | 'tiktok_aldia'
  followers INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (week_start, account)
);

-- Publicaciones que queríamos subir cada semana y las que se subieron de verdad
CREATE TABLE IF NOT EXISTS social_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  week_start DATE NOT NULL,
  account TEXT NOT NULL,
  planned INTEGER NOT NULL DEFAULT 0,
  published INTEGER,              -- NULL = la semana todavía no se ha revisado
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE (week_start, account)
);

-- Tareas del diagrama de Gantt
CREATE TABLE IF NOT EXISTS gantt_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  owner TEXT,                     -- 'Guille' | 'Millán' | 'Ambos'
  category TEXT DEFAULT 'Interno',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INTEGER DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE social_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE gantt_items ENABLE ROW LEVEL SECURITY;


-- ==========================================
-- ROADMAP DE ARRANQUE (v2): contenido, comunidad, ofertas
-- ==========================================

-- Calendario de contenido: qué se publica, cuándo y en qué punto está
CREATE TABLE IF NOT EXISTS content_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  publish_date DATE,              -- NULL = banco de ideas
  platform TEXT NOT NULL,         -- 'tiktok' | 'linkedin' | 'newsletter' | 'directo' | 'telegram'
  kind TEXT,                      -- 'noticia' | 'automatizacion' | 'tutorial' | 'caso' | 'post' | 'pregunta' | ...
  owner TEXT,                     -- 'Guille' | 'Millán' | 'Aldia'
  title TEXT NOT NULL,
  keyword TEXT,                   -- palabra del «Comenta PALABRA»
  status TEXT DEFAULT 'idea',     -- 'idea' | 'guion' | 'voz' | 'montado' | 'publicado'
  url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Comunidad: leads y contactos, y en qué escalón de la escalera están
CREATE TABLE IF NOT EXISTS community_people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  kind TEXT DEFAULT 'lead',       -- 'lead' | 'contacto'
  stage INTEGER DEFAULT 2,        -- 1 Ver · 2 Comentar · 3 Recibir · 4 Suscribirse · 5 Participar · 6 Hablar con ALDIA
  origin TEXT,                    -- 'LinkedIn' | 'TikTok' | 'Web' | 'Boca a boca'
  keyword TEXT,
  email TEXT,
  company TEXT,
  sector TEXT,
  pain TEXT,                      -- qué le duele
  pending_reply BOOLEAN DEFAULT false,
  pending_since TIMESTAMP WITH TIME ZONE,
  last_contact DATE,
  next_step TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ofertas: propuestas y presupuestos por escalón de servicio
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client TEXT NOT NULL,
  tier TEXT DEFAULT 'diagnostico',  -- 'diagnostico' | 'portfolio' | 'mantenimiento'
  status TEXT DEFAULT 'reunion',    -- 'reunion' | 'diagnostico' | 'propuesta' | 'negociacion' | 'ganada' | 'perdida'
  amount NUMERIC DEFAULT 0,         -- pago único (€)
  monthly NUMERIC DEFAULT 0,        -- mantenimiento (€/mes)
  problem TEXT,                     -- el problema del cliente, con sus palabras
  pattern TEXT,                     -- etiqueta del problema para detectar repeticiones (SaaS)
  next_step TEXT,
  next_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ajustes compartidos (candidato a SaaS, etc.)
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

