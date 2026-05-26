import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { sendEmail } from "@/lib/mailer";
import { createClient } from "@/lib/supabase-server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const schema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const { email } = parsed.data;
    const supabase = await createClient();

    const { data: user } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('email', email)
      .single();

    // Siempre responder igual para no exponer si el email existe
    if (!user) {
      return NextResponse.json({ success: true });
    }

    // Invalidar tokens anteriores
    await supabase
      .from('PasswordResetToken')
      .delete()
      .eq('userId', user.id);

    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await supabase
      .from('PasswordResetToken')
      .insert({ userId: user.id, token, expiresAt });

    const resetUrl = `${APP_URL}/reset-password?token=${token}`;

    sendEmail({
      to: email,
      subject: "Recupera tu contraseña – Musa",
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#f5f3ff;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f3ff;padding:40px 16px">
            <tr><td align="center">
              <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(109,40,217,.08)">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:40px 40px 32px;text-align:center">
                    <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:-0.5px">Musa ✨</h1>
                    <p style="margin:8px 0 0;color:#e9d5ff;font-size:14px">Tu asistente de belleza</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:40px">
                    <h2 style="margin:0 0 8px;color:#1a1a2e;font-size:22px;font-weight:700">¿Olvidaste tu contraseña?</h2>
                    <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6">
                      Hola <strong>${user.name}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta en Musa.
                    </p>
                    <p style="margin:0 0 32px;color:#6b7280;font-size:15px;line-height:1.6">
                      Haz clic en el botón de abajo para crear una nueva contraseña. Este enlace expira en <strong>1 hora</strong>.
                    </p>
                    <table cellpadding="0" cellspacing="0" style="margin:0 auto">
                      <tr>
                        <td style="background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:50px;text-align:center">
                          <a href="${resetUrl}" style="display:inline-block;padding:16px 40px;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;letter-spacing:0.2px">
                            Restablecer Contraseña →
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 40px;background:#faf5ff;border-top:1px solid #ede9fe;text-align:center">
                    <p style="margin:0;color:#9ca3af;font-size:12px">© 2026 Musa. Todos los derechos reservados.</p>
                  </td>
                </tr>
              </table>
            </td></tr>
          </table>
        </body>
        </html>
      `,
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[forgot-password POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
