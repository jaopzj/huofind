import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('[Supabase] Missing environment variables. Please create .env file with:');
    console.error('  SUPABASE_URL=https://your-project.supabase.co');
    console.error('  SUPABASE_SERVICE_KEY=your-service-role-key');
    process.exit(1);
}

// Create Supabase client with service role key (for backend operations)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('[Supabase] Client initialized successfully');

export default supabase;
