import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
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
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (error) {
    console.error("[email send error]", error);
  }
}
