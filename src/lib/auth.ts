import { NextRequest, NextResponse } from "next/server";
import { createClient } from "./supabase-server";

export async function getSession(req?: NextRequest, res?: NextResponse) {
  try {
    const supabase = await createClient(req, res);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    return {
      userId: session.user.id,
      phone: session.user.phone || "",
      email: session.user.email,
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
