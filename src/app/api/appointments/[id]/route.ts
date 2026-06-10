import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { awardLoyaltyPoints } from "@/lib/loyalty";
import { normalizeCurrency } from "@/lib/currency";

const patchSchema = z.object({
  status: z
    .enum(["pending", "confirmed", "completed", "no_show", "cancelled"])
    .optional(),
  notes: z.string().optional(),
  payment: z
    .object({
      amount: z.number(),
      currency: z.enum(["USD", "BS", "Bs"]).optional().default("USD"),
      method: z.enum([
        "efectivo_bs",
        "efectivo_usd",
        "pago_movil",
        "zelle",
        "transferencia",
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

  const formatted = {
    ...appointment,
    client: Array.isArray(appointment.client) ? appointment.client[0] : appointment.client,
    service: Array.isArray(appointment.service) ? appointment.service[0] : appointment.service,
    payment: Array.isArray(appointment.payment) ? appointment.payment[0] : appointment.payment,
  };

  return NextResponse.json(formatted);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

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

    // Actualizar cita solo si hay campos a actualizar
    const updateFields = {
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
    };

    if (Object.keys(updateFields).length > 0) {
      const { error: updateError } = await supabase
        .from('Appointment')
        .update(updateFields)
        .eq('id', id);
      if (updateError) throw updateError;
    }

    // Registrar/actualizar pago si se envía
    // Usamos adminClient para Payment porque la tabla no tiene RLS de escritura para staff
    if (payment) {
      const { amount, method, isPaid = true, notes: payNotes } = payment;
      // El enum zod acepta "Bs" por retrocompatibilidad, pero en BD siempre se persiste "BS"
      const currency = normalizeCurrency(payment.currency);
      const adminForPayment = createAdminClient();

      // Verificar si ya existe un pago para esta cita
      const { data: existingPayment } = await adminForPayment
        .from('Payment')
        .select('id')
        .eq('appointmentId', id)
        .maybeSingle();

      if (existingPayment) {
        const { error: paymentError } = await adminForPayment
          .from('Payment')
          .update({
            amount,
            currency,
            method,
            isPaid,
            notes: payNotes ?? null,
            paidAt: isPaid ? new Date().toISOString() : null,
          })
          .eq('id', existingPayment.id);
        if (paymentError) throw paymentError;
      } else {
        const { error: paymentError } = await adminForPayment
          .from('Payment')
          .insert({
            id: crypto.randomUUID(),
            appointmentId: id,
            amount,
            currency,
            method,
            isPaid,
            notes: payNotes ?? null,
            paidAt: isPaid ? new Date().toISOString() : null,
          });
        if (paymentError) throw paymentError;
      }
    }

    // Usamos adminClient para el SELECT final porque incluye Payment (cross-table)
    const adminForRead = createAdminClient();
    const { data: result } = await adminForRead
      .from('Appointment')
      .select('*, client:Client(*), service:Service(*), payment:Payment(*)')
      .eq('id', id)
      .single();

    const formattedResult = result ? {
      ...result,
      client: Array.isArray(result.client) ? result.client[0] : result.client,
      service: Array.isArray(result.service) ? result.service[0] : result.service,
      payment: Array.isArray(result.payment) ? result.payment[0] : result.payment,
    } : null;

    // Auto-sumar puntos de fidelización cuando la cita se marca como completada
    if (status === "completed" && result) {
      try {
        const adminDb = createAdminClient();
        const { data: userRow } = await adminDb
          .from("User")
          .select("businessId")
          .eq("id", session.userId)
          .single();

        if (!userRow?.businessId) {
          console.warn("[loyalty award] businessId not found for userId:", session.userId);
        } else {
          const clientId = Array.isArray(result.client) ? result.client[0]?.id : result.client?.id;
          if (!clientId) {
            console.warn("[loyalty award] clientId could not be extracted from result");
          } else {
            const awarded = await awardLoyaltyPoints({
              businessId: userRow.businessId,
              clientId,
              appointmentId: id,
              createdBy: session.userId,
            });
            if (!awarded) {
              console.info("[loyalty award] skipped — no active program or already processed for appointment:", id);
            }
          }
        }
      } catch (loyaltyErr) {
        // No bloquear la respuesta por un fallo de fidelización
        console.error("[loyalty award] unexpected error:", loyaltyErr);
      }
    }

    return NextResponse.json(formattedResult);
  } catch (error) {
    console.error("[appointments PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

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
