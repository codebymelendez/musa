import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const admin = createAdminClient();

    // 1. Verificar si el usuario es administrador en la base de datos
    const { data: currentUser } = await admin
      .from('User')
      .select('isAdmin')
      .eq('id', session.userId)
      .single();

    if (!currentUser || !currentUser.isAdmin) {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    // 2. Obtener el cuerpo de la petición
    const body = await req.json();
    const { action, notes } = body; // action: 'approve' | 'reject'

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Acción inválida. Debe ser 'approve' o 'reject'" }, { status: 400 });
    }

    // 3. Buscar el pago a procesar junto con la expiración actual del negocio
    const { data: payment, error: fetchError } = await admin
      .from('SubscriptionPayment')
      .select('*, business:Business(planExpiresAt)')
      .eq('id', id)
      .maybeSingle();
 
    if (fetchError || !payment) {
      return NextResponse.json({ error: "Registro de pago no encontrado" }, { status: 404 });
    }
 
    if (payment.status !== "under_review") {
      return NextResponse.json({ error: `El pago ya ha sido procesado (Estado: ${payment.status})` }, { status: 400 });
    }

    const rawBusiness = Array.isArray(payment.business) ? payment.business[0] : payment.business;
    const currentExpiresAt = rawBusiness?.planExpiresAt;
 
    if (action === "approve") {
      // 4. APROBAR PAGO
      // A. Actualizar pago usando update atómico con filtro de estado (concurrencia)
      const { data: updatedPayments, error: payUpdateError } = await admin
        .from('SubscriptionPayment')
        .update({
          status: 'approved',
          approvedAt: new Date().toISOString(),
          approvedBy: session.userId,
          notes: notes || payment.notes,
        })
        .eq('id', id)
        .eq('status', 'under_review')
        .select();

      if (payUpdateError) throw payUpdateError;

      if (!updatedPayments || updatedPayments.length === 0) {
        return NextResponse.json({ error: "El pago ya ha sido procesado por otro administrador o no está en revisión" }, { status: 400 });
      }

      // Calcular fecha de expiración sumando 30 días a partir de la expiración actual si está en el futuro, o a partir de hoy
      let expiresDate = new Date();
      if (currentExpiresAt && new Date(currentExpiresAt) > new Date()) {
        expiresDate = new Date(currentExpiresAt);
      }
      expiresDate.setDate(expiresDate.getDate() + 30);
      const expiresISO = expiresDate.toISOString();
      const expiresFormatted = expiresDate.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
 
      // B. Actualizar negocio
      const { error: bizUpdateError } = await admin
        .from('Business')
        .update({
          planId: payment.planId,
          planStatus: 'active',
          planExpiresAt: expiresISO
        })
        .eq('id', payment.businessId);
 
      if (bizUpdateError) throw bizUpdateError;
 
      // C. Crear notificación para el profesional
      await admin
        .from('Notification')
        .insert({
          id: crypto.randomUUID(),
          userId: payment.userId,
          title: "¡Plan Activado! 🎉",
          body: `Tu pago manual ha sido verificado con éxito. Tu plan ahora está activo hasta el ${expiresFormatted}.`,
          url: "/settings/plans",
          read: false,
        });
 
      return NextResponse.json({ success: true, status: 'approved', expiresAt: expiresISO });
    } else {
      // 5. RECHAZAR PAGO
      if (!notes || notes.trim().length === 0) {
        return NextResponse.json({ error: "Debes ingresar el motivo del rechazo en el campo 'notes'" }, { status: 400 });
      }
 
      // A. Actualizar pago usando update atómico con filtro de estado (concurrencia)
      const { data: updatedPayments, error: payUpdateError } = await admin
        .from('SubscriptionPayment')
        .update({
          status: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: session.userId,
          notes: notes.trim(),
        })
        .eq('id', id)
        .eq('status', 'under_review')
        .select();

      if (payUpdateError) throw payUpdateError;

      if (!updatedPayments || updatedPayments.length === 0) {
        return NextResponse.json({ error: "El pago ya ha sido procesado por otro administrador o no está en revisión" }, { status: 400 });
      }
 
      // B. Actualizar negocio
      const { error: bizUpdateError } = await admin
        .from('Business')
        .update({
          planStatus: 'payment_rejected'
        })
        .eq('id', payment.businessId);
 
      if (bizUpdateError) throw bizUpdateError;
 
      // C. Crear notificación para el profesional
      await admin
        .from('Notification')
        .insert({
          id: crypto.randomUUID(),
          userId: payment.userId,
          title: "Pago de Plan Rechazado ⚠️",
          body: `Tu pago manual no pudo ser verificado. Motivo: ${notes.trim()}. Revisa los datos y reintenta.`,
          url: "/settings/plans",
          read: false,
        });
 
      return NextResponse.json({ success: true, status: 'rejected' });
    }
  } catch (error) {
    console.error("[admin/plan-payments PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
