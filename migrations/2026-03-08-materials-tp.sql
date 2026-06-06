-- ChimioLab migration: materials inventory + TP session fields
-- Run this in the Supabase SQL editor on the existing project database.

CREATE TABLE IF NOT EXISTS public.materials (
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

ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.materials;
CREATE POLICY "Allow all operations for authenticated users"
ON public.materials
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

ALTER TABLE public.tp_sessions
ADD COLUMN IF NOT EXISTS code TEXT,
ADD COLUMN IF NOT EXISTS student_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.tp_sessions
SET code = generated.generated_code
FROM (
  SELECT
    id,
    'TP-' || LPAD((ROW_NUMBER() OVER (ORDER BY created_at, id))::text, 3, '0') AS generated_code
  FROM public.tp_sessions
) AS generated
WHERE public.tp_sessions.id = generated.id
  AND public.tp_sessions.code IS NULL;

ALTER TABLE public.tp_sessions
ALTER COLUMN code SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'tp_sessions_code_unique_idx'
  ) THEN
    CREATE UNIQUE INDEX tp_sessions_code_unique_idx ON public.tp_sessions(code);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.tp_materials (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tp_session_id UUID REFERENCES public.tp_sessions(id) ON DELETE CASCADE,
  material_id UUID REFERENCES public.materials(id),
  required_quantity INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE public.tp_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON public.tp_materials;
CREATE POLICY "Allow all operations for authenticated users"
ON public.tp_materials
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
