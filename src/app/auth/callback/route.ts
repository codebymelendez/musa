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
    .select("onboardingDone, appRole")
    .eq("id", authUser.id)
    .single();

  // Usuario nuevo via OAuth (Google) — redirigir a selección de rol
  if (!profile) {
    // Guardar metadata de Google en los claims de Supabase Auth para uso posterior
    await admin.auth.admin.updateUserById(authUser.id, {
      user_metadata: {
        ...(authUser.user_metadata ?? {}),
        pending_role_selection: true,
      },
    }).catch(() => {}); // no bloquear si falla

    const selectRoleUrl = new URL("/auth/select-role", origin);
    const finalRes = NextResponse.redirect(selectRoleUrl);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() === "set-cookie") {
        finalRes.headers.append("set-cookie", value);
      }
    });
    return finalRes;
  }

  // Usuario existente — redirigir según su rol
  const isClient = profile.appRole === "client";
  let destination: string;

  if (isClient) {
    destination = "/client";
  } else {
    destination = profile.onboardingDone ? "/home" : "/onboarding";
  }

  const finalResponse = NextResponse.redirect(new URL(destination, origin));

  // Copiar las cookies de sesión que Supabase seteó en `response` a `finalResponse`
  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") {
      finalResponse.headers.append("set-cookie", value);
    }
  });

  return finalResponse;
}
