ALTER TABLE public.tp_sessions
ADD COLUMN room TEXT,
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;
