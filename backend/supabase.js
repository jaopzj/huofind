import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Create Supabase client with service role key (for backend operations)
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('[Supabase] Client initialized successfully');

export default supabase;
