import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = "MUSA <bienvenida@getmusa.app>";

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    if (resend) {
      await resend.emails.send({ from: FROM, to, subject, html });
    } else {
      console.warn("⚠️ RESEND_API_KEY no configurado. El correo se mostraría así:");
      console.log(`Para: ${to}`);
      console.log(`Asunto: ${subject}`);
    }
  } catch (error) {
    console.error("[email send error]", error);
  }
}
