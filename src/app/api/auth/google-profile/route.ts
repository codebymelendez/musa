// POST /api/auth/google-profile
// Crea el perfil de usuario después de Google Sign-In cuando el usuario
// no tiene perfil en la tabla User (primer acceso).
// Requiere sesión activa de Supabase + el rol elegido ('professional' | 'client').

import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { welcomeClient } from "@/lib/emails/welcome-client";

const schema = z.object({
  appRole: z.enum(["owner", "client"]),
});

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ ok: false });
  const session = await getSession(req, response);

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }

  const { appRole } = parsed.data;
  const admin = createAdminClient();

  // Verificar si el perfil ya existe
  const { data: existing } = await admin
    .from("User")
    .select("id, appRole, onboardingDone")
    .eq("id", session.userId)
    .maybeSingle();

  if (existing) {
    // Ya tiene perfil — devolver datos sin modificar
    return new NextResponse(
      JSON.stringify({
        ok: true,
        appRole: existing.appRole,
        onboardingDone: existing.onboardingDone,
      }),
      { status: 200, headers: response.headers }
    );
  }

  // Obtener los datos de Google desde Supabase Auth
  const { data: authData } = await admin.auth.admin.getUserById(session.userId);
  const meta = authData?.user?.user_metadata ?? {};

  const firstName = (meta.given_name as string | undefined) ?? "";
  const lastName = (meta.family_name as string | undefined) ?? "";
  const rawName =
    [firstName, lastName].filter(Boolean).join(" ") ||
    (meta.full_name as string | undefined) ||
    (meta.name as string | undefined) ||
    session.email?.split("@")[0] ||
    "Usuario";

  const avatarUrl = (meta.avatar_url as string | undefined) ?? null;

  // Generar slug único
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
    id: session.userId,
    email: session.email ?? null,
    name: rawName,
    slug,
    avatarUrl,
    appRole,
    onboardingDone: appRole === "client", // las clientas no necesitan onboarding
    updatedAt: new Date().toISOString(),
  });

  if (insertError) {
    console.error("[google-profile POST] Error creando perfil:", insertError);
    return NextResponse.json({ error: "Error al crear perfil" }, { status: 500 });
  }

  // Enviar email de bienvenida para clientas — after() para que Vercel no
  // congele la promesa al responder
  if (appRole === "client" && session.email) {
    const emailTo = session.email;
    after(async () => {
      try {
        await sendEmail({
          to: emailTo,
          subject: "Bienvenida a MUSA ✨",
          html: welcomeClient({ nombre: rawName }),
        });
      } catch (err) {
        console.error("[welcome-client google email]", err);
      }
    });
  }

  // Limpiar el flag de pending_role_selection en Supabase Auth metadata
  await admin.auth.admin.updateUserById(session.userId, {
    user_metadata: {
      ...meta,
      pending_role_selection: undefined,
    },
  }).catch(() => {});

  return new NextResponse(
    JSON.stringify({ ok: true, appRole, onboardingDone: appRole === "client" }),
    { status: 201, headers: response.headers }
  );
}
