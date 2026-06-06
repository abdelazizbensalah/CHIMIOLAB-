-- Schema for ChimioLab Platform
-- Note: You should run this in your Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: users (extends auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'preparator')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: allowed_emails
CREATE TABLE public.allowed_emails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'preparator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: products
CREATE TABLE public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  chemical_formula TEXT,
  cas_number TEXT,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit TEXT CHECK (unit IN ('g', 'ml', 'L', 'kg', 'mol')),
  min_quantity_alert NUMERIC NOT NULL DEFAULT 0,
  expiry_date DATE,
  location TEXT,
  supplier TEXT,
  qr_code_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: safety_sheets
CREATE TABLE public.safety_sheets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  pictograms JSONB DEFAULT '[]'::jsonb,
  epi_required JSONB DEFAULT '[]'::jsonb,
  storage_rules TEXT,
  physical_properties JSONB DEFAULT '{}'::jsonb,
  pdf_url TEXT,
  ghs_class TEXT
);

-- Table: materials
CREATE TABLE public.materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('verrerie', 'mesure', 'securite', 'electricite', 'chauffage')),
  description TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  quantity_unit TEXT,
  condition_status TEXT NOT NULL CHECK (condition_status IN ('good', 'maintenance', 'out_of_service')) DEFAULT 'good',
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: rooms
CREATE TABLE public.rooms (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: requests
CREATE TABLE public.requests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    teacher_id UUID REFERENCES public.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    request_type TEXT NOT NULL CHECK (request_type IN ('product', 'material', 'other')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: tp_sessions
CREATE TABLE public.tp_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  level TEXT CHECK (level IN ('collège', 'lycée', 'CRMEF')),
  subject TEXT,
  date DATE,
  duration_minutes INTEGER,
  student_count INTEGER NOT NULL DEFAULT 0,
  teacher_id UUID REFERENCES public.users(id),
  room TEXT,
  start_time TIME,
  end_time TIME,
  objectives TEXT,
  status TEXT CHECK (status IN ('planned', 'done')) DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: tp_reactifs
CREATE TABLE public.tp_reactifs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tp_session_id UUID REFERENCES public.tp_sessions(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  planned_quantity NUMERIC NOT NULL,
  used_quantity NUMERIC,
  unit TEXT CHECK (unit IN ('g', 'ml', 'L', 'kg', 'mol'))
);

-- Table: tp_materials
CREATE TABLE public.tp_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tp_session_id UUID REFERENCES public.tp_sessions(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id),
  required_quantity INTEGER NOT NULL DEFAULT 1
);

-- Table: tp_checklist_items
CREATE TABLE public.tp_checklist_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tp_session_id UUID REFERENCES public.tp_sessions(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  done_at TIMESTAMP WITH TIME ZONE,
  done_by UUID REFERENCES public.users(id)
);

-- Table: tp_consumption_logs
CREATE TABLE public.tp_consumption_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tp_session_id UUID REFERENCES public.tp_sessions(id) ON DELETE CASCADE,
  tp_reactif_id UUID REFERENCES public.tp_reactifs(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity_used NUMERIC NOT NULL,
  unit TEXT CHECK (unit IN ('g', 'ml', 'L', 'kg', 'mol')),
  note TEXT,
  logged_by UUID REFERENCES public.users(id),
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: quiz
CREATE TABLE public.quiz (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tp_session_id UUID REFERENCES public.tp_sessions(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT CHECK (correct_answer IN ('a', 'b', 'c', 'd')) NOT NULL,
  explanation TEXT
);

-- Table: quiz_results
CREATE TABLE public.quiz_results (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  quiz_id UUID REFERENCES public.quiz(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.users(id),
  answer TEXT CHECK (answer IN ('a', 'b', 'c', 'd')),
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: alerts
CREATE TABLE public.alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('expired', 'low_stock', 'missing_fds', 'incompatibility')),
  message TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('red', 'orange', 'yellow')),
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Table: activity_logs
CREATE TABLE public.activity_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  tp_session_id UUID REFERENCES public.tp_sessions(id) ON DELETE SET NULL,
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Row Level Security boilerplate
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_reactifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tp_consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Note: Configure RLS policies via Supabase Dashboard or script. Example generic wide-open for dev:
CREATE POLICY "Allow all operations for authenticated users" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.safety_sheets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.tp_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.tp_reactifs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.tp_materials FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.tp_checklist_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.tp_consumption_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.quiz FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.quiz_results FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.alerts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.activity_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for authenticated users" ON public.allowed_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Public read access for the public website
CREATE POLICY "Allow public read access" ON public.products FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON public.safety_sheets FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON public.materials FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON public.tp_sessions FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON public.tp_reactifs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow public read access" ON public.tp_materials FOR SELECT TO anon USING (true);

-- Explicit RLS policies for tp_reactifs (TP reagents)
-- Useful when legacy/stricter policies already exist in the project.
DROP POLICY IF EXISTS "tp_reactifs_select_auth" ON public.tp_reactifs;
DROP POLICY IF EXISTS "tp_reactifs_insert_auth" ON public.tp_reactifs;
DROP POLICY IF EXISTS "tp_reactifs_update_auth" ON public.tp_reactifs;
DROP POLICY IF EXISTS "tp_reactifs_delete_auth" ON public.tp_reactifs;

CREATE POLICY "tp_reactifs_select_auth"
ON public.tp_reactifs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "tp_reactifs_insert_auth"
ON public.tp_reactifs
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "tp_reactifs_update_auth"
ON public.tp_reactifs
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "tp_reactifs_delete_auth"
ON public.tp_reactifs
FOR DELETE
TO authenticated
USING (true);

-- Storage bucket + RLS policies for FDS PDF uploads
-- Required for: supabase.storage.from('fds-pdfs').upload(...)
INSERT INTO storage.buckets (id, name, public)
VALUES ('fds-pdfs', 'fds-pdfs', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated can read FDS PDFs" ON storage.objects;
CREATE POLICY "Authenticated can read FDS PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'fds-pdfs');

DROP POLICY IF EXISTS "Authenticated can upload FDS PDFs" ON storage.objects;
CREATE POLICY "Authenticated can upload FDS PDFs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fds-pdfs');

DROP POLICY IF EXISTS "Authenticated can update FDS PDFs" ON storage.objects;
CREATE POLICY "Authenticated can update FDS PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'fds-pdfs')
WITH CHECK (bucket_id = 'fds-pdfs');

DROP POLICY IF EXISTS "Authenticated can delete FDS PDFs" ON storage.objects;
CREATE POLICY "Authenticated can delete FDS PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'fds-pdfs');
