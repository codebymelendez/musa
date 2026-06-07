// Cliente Supabase con service role key.
// Bypasa Row Level Security (RLS) — usar SOLO en server-side para operaciones administrativas.
// NUNCA importar desde componentes cliente ni exponer al browser.

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    if (process.env.NODE_ENV === "production") {
      console.warn("Faltan variables de entorno para Supabase Admin en build. Mockeando...");
      const mockQuery: any = {
        select: () => mockQuery,
        eq: () => mockQuery,
        single: () => ({ data: null, error: null }),
        limit: () => mockQuery,
        order: () => mockQuery,
        in: () => mockQuery,
        gt: () => mockQuery,
        gte: () => mockQuery,
        lt: () => mockQuery,
        lte: () => mockQuery,
        not: () => mockQuery,
        or: () => mockQuery,
        then: (resolve: any) => resolve({ data: [], error: null })
      };
      return {
        from: () => mockQuery,
        auth: {
          admin: {
            generateLink: () => ({ data: null, error: null })
          }
        }
      } as any;
    }
    throw new Error(
      "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
