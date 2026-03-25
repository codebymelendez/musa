export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos de inicio de sesión inválidos" },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;

    // Crear la respuesta primero para que Supabase pueda setear las cookies
    const response = NextResponse.json({ user: null });
    const supabase = await createClient(req, response);

    // 1. Login en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const friendlyMessages: Record<string, string> = {
        "Invalid login credentials": "Credenciales incorrectas",
        "Email not confirmed": "Debes confirmar tu correo electrónico antes de iniciar sesión. Revisa tu bandeja de entrada.",
      };
      const message = friendlyMessages[authError.message] ?? authError.message;
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
    }

    // 2. Obtener perfil. Usar admin client para bypassar RLS y evitar
    //    el error "Perfil de usuario no encontrado" si el insert inicial falló.
    const admin = createAdminClient();
    const { data: userProfile, error: profileError } = await admin
      .from("User")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("[login profile error]", profileError);
      // Perfil huérfano: el auth user existe pero el profile no fue creado.
      // Crear el perfil ahora para recuperar la cuenta.
      const name = authData.user.email?.split("@")[0] ?? "Usuario";
      const slug =
        name.toLowerCase().replace(/[^a-z0-9]/g, "-") +
        "-" +
        Math.random().toString(36).substring(2, 7);

      const { data: newProfile, error: createError } = await admin
        .from("User")
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          name,
          slug,
          onboardingDone: false,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newProfile) {
        console.error("[login auto-create profile error]", createError);
        return NextResponse.json(
          { error: "Error al recuperar tu perfil. Contacta soporte." },
          { status: 500 }
        );
      }

      return new NextResponse(JSON.stringify({ user: newProfile }), {
        status: 200,
        headers: response.headers,
      });
    }

    return new NextResponse(JSON.stringify({ user: userProfile }), {
      status: 200,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
