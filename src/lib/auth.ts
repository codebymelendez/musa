// src/lib/auth.ts
// Supabase usa getUser() en server-side para verificar la sesión contra el servidor
// (más seguro que getSession(), que confía en la cookie del cliente sin revalidar).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./supabase-server";

export async function getSession(req?: NextRequest, res?: NextResponse) {
  try {
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

export async function signOut(res?: NextResponse) {
  const supabase = await createClient(undefined, res);
  await supabase.auth.signOut();
}
