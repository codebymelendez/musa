import { createClient } from '@supabase/supabase-js'

// Cliente de solo lectura pública — sin sesión de usuario
// La auth de clientas usa JWT propio (ver clientAuth.ts)
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
)
