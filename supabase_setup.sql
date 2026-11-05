-- ALDIA SMART CONNECT - SINGLE SHARED ENVIRONMENT SETUP
-- All authenticated users share the same data

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Clean up old tables/columns if necessary (we keep data but remove org_id usage)
-- We don't drop tables to avoid data loss, just simplify policies

-- 3. Ensure tables exist
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'Miembro',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS finances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_name TEXT NOT NULL,
  payment_status TEXT NOT NULL,
  setup_cost NUMERIC DEFAULT 0,
  monthly_fee NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL,
  renewal_date DATE,
  price_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  username_email TEXT,
  password_text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  full_description TEXT,
  due_date TEXT,
  assigned_to TEXT,
  status TEXT DEFAULT 'todo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. CLEANUP ALL POLICIES
DO $$ 
DECLARE
  pol record;
BEGIN
  FOR pol IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON ' || quote_ident(pol.tablename);
  END LOOP;
END $$;

-- 5. ENABLE RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE finances ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 6. PUBLIC SHARED POLICIES (Everyone has access without login)
CREATE POLICY "Global Shared Access" ON team_members FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Global Shared Access" ON finances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Global Shared Access" ON subscriptions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Global Shared Access" ON credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Global Shared Access" ON tasks FOR ALL USING (true) WITH CHECK (true);
