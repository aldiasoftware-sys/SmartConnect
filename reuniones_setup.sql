-- REUNIONES SETUP
CREATE TABLE IF NOT EXISTS reuniones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_reunion TEXT NOT NULL,
  fecha_reunion TIMESTAMP WITH TIME ZONE NOT NULL,
  duracion TEXT, -- e.g., "30 min", "1 hora"
  origen TEXT CHECK (origen IN ('Calendly', 'Telefono', 'Otro')),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE reuniones ENABLE ROW LEVEL SECURITY;

-- Políticas: las pone seguridad_rls.sql (ejecutarlo siempre al final). Nunca USING (true).
