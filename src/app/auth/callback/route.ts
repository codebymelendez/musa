// GET /auth/callback
// Supabase redirige aquí tras confirmación de email, magic link u OAuth (Google).
// Intercambia el code por una sesión, crea el perfil si no existe (OAuth new user),
// y redirige al destino correcto.
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

// Previene open redirects — solo acepta rutas relativas dentro de la app
function safeNext(raw: string | null): string {
  if (!raw) return "/home";
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/home";
  return raw;
}

export async function GET(req: NextRequest) {
  const { searchParams, origin } = req.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) {
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

  const authUser = data.session.user;
  const admin = createAdminClient();

  // Verificar si el perfil ya existe en la tabla User
  const { data: profile } = await admin
    .from("User")
    .select("onboardingDone")
    .eq("id", authUser.id)
    .single();

  // Usuario nuevo via OAuth (Google) — crear perfil mínimo para que el onboarding pueda actualizarlo
  if (!profile) {
    const rawName =
      (authUser.user_metadata?.full_name as string | undefined) ??
      (authUser.user_metadata?.name as string | undefined) ??
      authUser.email?.split("@")[0] ??
      "Usuario";

    const slug =
      rawName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 7);

    const { error: insertError } = await admin.from("User").insert({
      id: authUser.id,
      email: authUser.email ?? null,
      name: rawName,
      slug,
      avatarUrl: (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
      onboardingDone: false,
      updatedAt: new Date().toISOString(),
    });

    if (insertError) {
      console.error("[auth/callback] Error creando perfil OAuth:", insertError);
    }
  }

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
