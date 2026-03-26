import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const patchSchema = z.object({
  status: z
    .enum(["pending", "confirmed", "completed", "no_show", "cancelled"])
    .optional(),
  notes: z.string().optional(),
  payment: z
    .object({
      amount: z.number(),
      method: z.enum([
        "efectivo_bs",
        "efectivo_usd",
        "pago_movil",
        "zelle",
        "otro",
      ]),
      isPaid: z.boolean().optional(),
      notes: z.string().optional(),
    })
    .optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  // Usamos Admin client para el GET para asegurar que se vean los datos de la clienta (bypassing RLS)
  const supabase = createAdminClient();

  const { data: appointment } = await supabase
    .from('Appointment')
    .select('*, client:Client(*), service:Service(*), payment:Payment(*)')
    .eq('id', id)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  return NextResponse.json(appointment);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: appointment } = await supabase
    .from('Appointment')
    .select('id')
    .eq('id', id)
    .eq('userId', session.userId)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { status, notes, payment } = parsed.data;

    // Actualizar cita
    const { error: updateError } = await supabase
      .from('Appointment')
      .update({
        ...(status && { status }),
        ...(notes !== undefined && { notes }),
      })
      .eq('id', id);

    if (updateError) throw updateError;

    // Registrar/actualizar pago si se envía
    if (payment) {
      const { amount, method, isPaid = true, notes: payNotes } = payment;

      const { error: paymentError } = await supabase
        .from('Payment')
        .upsert({
          appointmentId: id,
          amount,
          currency: "USD",
          method,
          isPaid,
          notes: payNotes,
          paidAt: isPaid ? new Date().toISOString() : null,
        }, { onConflict: 'appointmentId' });
      
      if (paymentError) throw paymentError;
    }

    const { data: result } = await supabase
      .from('Appointment')
      .select('*, client:Client(*), service:Service(*), payment:Payment(*)')
      .eq('id', id)
      .single();

    return NextResponse.json(result);
  } catch (error) {
    console.error("[appointments PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = await createClient();

  const { data: appointment } = await supabase
    .from('Appointment')
    .select('id')
    .eq('id', id)
    .eq('userId', session.userId)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
  }

  // Soft delete: cambiar estado a "cancelled"
  await supabase
    .from('Appointment')
    .update({ status: "cancelled" })
    .eq('id', id);

  return NextResponse.json({ ok: true });
}
