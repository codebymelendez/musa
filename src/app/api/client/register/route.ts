import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { signClientToken } from "@/lib/clientAuth";
import { randomUUID } from "crypto";
import { sendEmail } from "@/lib/email";
import { welcomeClient } from "@/lib/emails/welcome-client";

const schema = z.object({
  phone: z.string().min(7),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  birthday: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { phone, name, email, birthday } = parsed.data;
    const admin = createAdminClient();

    // Check if client already exists globally to avoid duplicated phone numbers if needed
    // However, Client records are usually tied to a `businessId` or `userId`.
    // We will create an 'orphan' client or simply insert them to store their phone and name.
    const { data: existingClient } = await admin
      .from('Client')
      .select('id, name, phone')
      .eq('phone', phone)
      .limit(1)
      .maybeSingle();

    const clientName = name;

    if (existingClient) {
      // Update existing if we found one
      const { error: updateError } = await admin
        .from('Client')
        .update({ name, email, updatedAt: new Date().toISOString() })
        .eq('id', existingClient.id);

      if (updateError) {
        console.error("[client register update error]", updateError);
      }
    } else {
      // Insert new client without tying to a specific user yet
      const { error: insertError } = await admin
        .from('Client')
        .insert({
          id: randomUUID(),
          name,
          phone,
          email: email || null,
          birthday: birthday || null,
        });

      if (insertError) {
        console.error("[client register insert error]", insertError);
        return NextResponse.json({ error: "Error al registrarte" }, { status: 500 });
      }

      // Enviar email de bienvenida solo en el primer registro
      if (email) {
        sendEmail({
          to: email,
          subject: "Bienvenida a MUSA ✨",
          html: welcomeClient({ nombre: name }),
        }).catch((err) => console.error("[welcome-client email]", err));
      }
    }

    const token = await signClientToken({ clientPhone: phone, clientName });

    return NextResponse.json({
      success: true,
      token,
      clientName,
    });
  } catch (error) {
    console.error("[client register POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
