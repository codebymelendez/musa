// src/lib/auth.ts
// Supabase usa getUser() en server-side para verificar la sesión contra el servidor
// (más seguro que getSession(), que confía en la cookie del cliente sin revalidar).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./supabase-server";
import { createAdminClient } from "./supabase-admin";

export async function getSession(req?: NextRequest, res?: NextResponse) {
  try {
    // Mobile clients send the Supabase JWT as a Bearer token (no cookies)
    if (req) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.slice(7);
        const { data: { user }, error } = await createAdminClient().auth.getUser(token);
        if (!error && user) {
          return { userId: user.id, phone: user.phone || "", email: user.email };
        }
      }
    }

    // Web clients use Supabase SSR cookie auth
    const supabase = await createClient(req, res);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    return {
      userId: user.id,
      phone: user.phone || "",
      email: user.email,
    };
  } catch (error) {
    console.error("[getSession error]", error);
    return null;
  }
}

export async function signOut(req?: NextRequest, res?: NextResponse) {
  const supabase = await createClient(req, res);
  await supabase.auth.signOut();
  
  // Forzar limpieza de cookies si el signOut de Supabase no fue suficiente
  if (res) {
    const cookiesToClear = [
      "sb-access-token", 
      "sb-refresh-token", 
      "supabase-auth-token"
    ];
    cookiesToClear.forEach(name => {
      res.cookies.set(name, "", { maxAge: -1, path: "/" });
    });
  }
}
