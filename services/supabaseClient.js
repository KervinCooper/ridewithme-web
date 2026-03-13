// services/supabaseClient.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tmkazgmbvqehihkxtcbd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRta2F6Z21idnFlaGloa3h0Y2JkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzNDY1MjEsImV4cCI6MjA4NjkyMjUyMX0.-TWegZ8TutXM3uKrlYqd9N0ktusIZjT2I8LintGsBdc';     // replace with anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
