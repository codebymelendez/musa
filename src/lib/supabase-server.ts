import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function createClient(req?: NextRequest, res?: NextResponse) {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req ? req.cookies.get(name)?.value : cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          if (res) {
            res.cookies.set({ name, value, ...options });
          } else {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // Silently fail if called in a place where cookies cannot be set
            }
          }
        },
        remove(name: string, options: CookieOptions) {
          if (res) {
            res.cookies.set({ name, value: '', ...options });
          } else {
            try {
              cookieStore.set({ name, value: '', ...options });
            } catch (error) {
              // Silently fail
            }
          }
        },
      },
    }
  );
}
