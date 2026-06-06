import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gpeqxrthnrnllpafchwe.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdwZXF4cnRobnJubGxwYWZjaHdlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzMzA1ODAsImV4cCI6MjA4NzkwNjU4MH0.U0PlTG_uh6j7twteZ76WuKWfcOj8jnLhqme0Ei0Z3bU';

export const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
});
