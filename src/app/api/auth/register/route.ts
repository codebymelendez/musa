export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().optional(),
  serviceType: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de registro inválidos: " + parsed.error.issues[0]?.message },
        { status: 400 }
      );
    }

    const { email, password, name, phone, serviceType } = parsed.data;

    // Crear la respuesta primero para que Supabase pueda setear las cookies
    const response = NextResponse.json({ user: null }, { status: 201 });
    const supabase = await createClient(req, response);

    // 1. Registrar en Supabase Auth
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${APP_URL}/auth/callback`,
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
    }

    // 2. Insertar perfil en la tabla User usando el cliente admin (bypasa RLS).
    // Necesario porque tras signUp con confirmación de email, session = null y
    // el cliente anon no tiene permisos para escribir en User si RLS está activo.
    const slug =
      name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") +
      "-" +
      Math.random().toString(36).substring(2, 7);

    const admin = createAdminClient();
    const { error: profileError } = await admin.from("User").insert({
      id: authData.user.id,
      email,
      phone: phone || null,
      name,
      slug,
      serviceType: serviceType || null,
      onboardingDone: false,
      updatedAt: new Date().toISOString(),
    });

    if (profileError) {
      console.error("[register profile error]", profileError);
      // El usuario en Auth ya fue creado. Intentar limpiar para evitar huérfanos.
      await admin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Error al crear el perfil. Intenta de nuevo." },
        { status: 500 }
      );
    }

    const userData = {
      id: authData.user.id,
      email,
      phone: phone || null,
      name,
      slug,
    };

    return new NextResponse(JSON.stringify({ user: userData }), {
      status: 201,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
