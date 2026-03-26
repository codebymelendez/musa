import nodemailer from "nodemailer";

/**
 * Mailer configurable por SMTP como alternativa a Resend.
 * Si no hay variables de entorno, hace console.log (modo dev/fallback).
 */

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "Musa <noreply@musa.app>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.warn("⚠️ SMTP no configurado. El correo se mostraría así:");
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Cuerpo: ${html.substring(0, 100)}...`);
    return { success: true, simulated: true };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });

    console.log("✅ Email enviado a:", to, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("❌ Error enviando email:", error);
    return { success: false, error };
  }
}
