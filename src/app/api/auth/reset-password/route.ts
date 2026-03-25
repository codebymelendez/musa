import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createClient } from "@/lib/supabase-server";

const schema = z.object({
  token: z.string().min(10),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { token, password } = parsed.data;
    const supabase = await createClient();

    const { data: resetToken } = await supabase
      .from('PasswordResetToken')
      .select('*, user:User(*)')
      .eq('token', token)
      .single();

    if (!resetToken) {
      return NextResponse.json(
        { error: "Enlace inválido o ya utilizado" },
        { status: 400 }
      );
    }

    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: "Este enlace ya fue utilizado" },
        { status: 400 }
      );
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      return NextResponse.json(
        { error: "Este enlace ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Actualizar usuario y marcar token como usado
    const { error: userError } = await supabase
      .from('User')
      .update({ passwordHash })
      .eq('id', resetToken.userId);

    if (userError) throw userError;

    const { error: tokenError } = await supabase
      .from('PasswordResetToken')
      .update({ usedAt: new Date().toISOString() })
      .eq('id', resetToken.id);

    if (tokenError) throw tokenError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[reset-password POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
