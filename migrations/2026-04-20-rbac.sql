-- Table: allowed_emails
CREATE TABLE public.allowed_emails (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'preparator')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all operations for authenticated users" ON public.allowed_emails FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Upgrade all existing users in the system to 'admin' so the owner is not locked out
UPDATE public.users SET role = 'admin' WHERE role != 'admin';

NOTIFY pgrst, 'reload schema';
