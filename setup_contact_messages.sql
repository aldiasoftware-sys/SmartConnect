-- CREATE TABLE FOR CONTACT MESSAGES
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    nombre_cliente TEXT NOT NULL,
    correo_cliente TEXT NOT NULL,
    telefono_cliente TEXT,
    mensaje_cliente TEXT NOT NULL,
    estado TEXT DEFAULT 'sin responder' CHECK (estado IN ('sin responder', 'respondido'))
);

-- ENABLE RLS
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- GLOBAL SHARED ACCESS POLICY (Consistent with your other tables)
CREATE POLICY "Global Shared Access" ON contact_messages FOR ALL USING (true) WITH CHECK (true);
