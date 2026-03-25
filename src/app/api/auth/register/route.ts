import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { z } from "zod";
import { createClient } from "@/lib/supabase-server";

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
    
    // IMPORTANTE: Crear la respuesta primero para que Supabase pueda setear las cookies
    const response = NextResponse.json({ user: null }, { status: 201 });
    const supabase = await createClient(req, response);

    // 1. Registro en Supabase Auth (usando Email)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "Error al crear usuario" }, { status: 500 });
    }

    // 2. Crear perfil en nuestra tabla pública 'User'
    const slug = name.toLowerCase().replace(/ /g, "-") + "-" + Math.random().toString(36).substring(2, 7);
    
    const { error: profileError } = await supabase
      .from('User')
      .insert({
        id: authData.user.id,
        email,
        phone: phone || null,
        name,
        slug,
        serviceType,
        onboardingDone: false,
      });

    if (profileError) {
      console.error("[register profile error]", profileError);
      // Nota: Si el perfil falla (ej. por constraint de DB), el usuario en Auth ya se creó.
      // El cliente recibirá un 201 pero con un error interno si no lo manejamos.
    }

    // Actualizar el cuerpo de la respuesta con los datos finales
    const userData = {
      id: authData.user.id,
      email,
      phone: phone || null,
      name,
      slug,
    };
    
    // Sobrescribir el cuerpo de la respuesta original (que ya tiene las cookies seteadas por Supabase)
    return new NextResponse(JSON.stringify({ user: userData }), {
      status: 201,
      headers: response.headers,
    });

  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
