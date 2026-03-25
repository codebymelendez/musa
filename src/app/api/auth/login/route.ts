import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

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
    
    // IMPORTANTE: Crear la respuesta primero para que Supabase pueda setear las cookies
    const response = NextResponse.json({ user: null });
    const supabase = await createClient(req, response);

    // 1. Login en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      // Mensaje amigable para el usuario
      const message = authError.message === "Invalid login credentials"
        ? "Credenciales incorrectas"
        : authError.message;
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Error de autenticación" }, { status: 500 });
    }

    // El cliente de Supabase server ya maneja las cookies por nosotros a través de createClient
    
    // 2. Obtener perfil del usuario
    const { data: userProfile, error: profileError } = await supabase
      .from('User')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !userProfile) {
      console.error("[login profile error]", profileError);
      return NextResponse.json({ error: "Perfil de usuario no encontrado" }, { status: 404 });
    }

    // Sobrescribir el cuerpo de la respuesta original (que ya tiene las cookies de sesión seteadas)
    return new NextResponse(JSON.stringify({ user: userProfile }), {
      status: 200,
      headers: response.headers,
    });

  } catch (error) {
    console.error("[login]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
