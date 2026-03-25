// GET /auth/callback
// Supabase redirige aquí tras confirmación de email o magic link.
// Intercambia el code por una sesión y redirige al destino correcto.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/home";

  if (!code) {
    // Sin code → redirigir a login con error
    return NextResponse.redirect(new URL("/login?error=missing_code", origin));
  }

  const response = NextResponse.redirect(new URL(next, origin));
  const supabase = await createClient(req, response);

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session) {
    console.error("[auth/callback]", error);
    return NextResponse.redirect(
      new URL("/login?error=confirmation_failed", origin)
    );
  }

  // Verificar si el usuario completó el onboarding
  const { data: profile } = await supabase
    .from("User")
    .select("onboardingDone")
    .eq("id", data.session.user.id)
    .single();

  const destination = profile?.onboardingDone ? "/home" : "/onboarding";

  const finalResponse = NextResponse.redirect(new URL(destination, origin));

  // Copiar las cookies de sesión que Supabase seteó en `response` a `finalResponse`
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      finalResponse.headers.append("set-cookie", value);
    }
  });

  return finalResponse;
}
