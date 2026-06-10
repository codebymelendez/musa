import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { isBs } from "@/lib/currency";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));

  const startOfMonth = new Date(year, month - 1, 1).toISOString();
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999).toISOString();

  try {
    const adminSupabase = createAdminClient();

    // ── Citas completadas del mes + Ingresos ──────────────────────────────────
    const { data: completedAppointments, error: appointmentsError } = await adminSupabase
      .from('Appointment')
      .select('serviceId, service:Service(name), payment:Payment(isPaid, amount, currency)')
      .eq('userId', session.userId)
      .eq('status', 'completed')
      .gte('startTime', startOfMonth)
      .lte('startTime', endOfMonth);

    if (appointmentsError) {
      console.error("[stats appointments error]", appointmentsError);
    }

    const appointments = completedAppointments || [];

    // Totales separados por moneda — nunca se mezclan en una sola cifra
    const getPayment = (apt: any) => (Array.isArray(apt.payment) ? apt.payment[0] : apt.payment);

    let monthlyRevenue = 0;
    let monthlyRevenueBs = 0;
    for (const apt of appointments as any[]) {
      const payment = getPayment(apt);
      if (!payment?.isPaid) continue;
      if (isBs(payment.currency)) monthlyRevenueBs += payment.amount || 0;
      else monthlyRevenue += payment.amount || 0;
    }

    // ── Top 3 servicios ───────────────────────────────────────────────────────
    const serviceCounts: Record<string, { name: string; count: number }> = {};
    for (const apt of appointments as any[]) {
      const key = apt.serviceId;
      if (!serviceCounts[key]) {
        serviceCounts[key] = { name: apt.service?.name || "Desconocido", count: 0 };
      }
      serviceCounts[key].count++;
    }

    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ name, count }) => ({ serviceName: name, count }));

    // ── Total de clientas ─────────────────────────────────────────────────────
    const { count: totalClients } = await adminSupabase
      .from('Client')
      .select('*', { count: 'exact', head: true })
      .eq('userId', session.userId);

    // ── Ticket promedio ───────────────────────────────────────────────────────
    // Ticket promedio por moneda: solo pagos USD para avgTicket, solo BS para avgTicketBs
    const paidPayments = (appointments as any[])
      .map(getPayment)
      .filter((p: any) => p?.isPaid);
    const paidUSD = paidPayments.filter((p: any) => !isBs(p.currency));
    const paidBS = paidPayments.filter((p: any) => isBs(p.currency));
    const avgTicket =
      paidUSD.length > 0
        ? paidUSD.reduce((s: number, p: any) => s + (p.amount ?? 0), 0) / paidUSD.length
        : 0;
    const avgTicketBs =
      paidBS.length > 0
        ? paidBS.reduce((s: number, p: any) => s + (p.amount ?? 0), 0) / paidBS.length
        : 0;

    // ── Ingresos acumulados del año ───────────────────────────────────────────
    const startOfYear = new Date(year, 0, 1).toISOString();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

    const { data: yearPayments } = await adminSupabase
      .from('Payment')
      .select('amount, currency, appointment:Appointment(startTime, status, userId)')
      .eq('isPaid', true)
      .eq('Appointment.userId', session.userId)
      .eq('Appointment.status', 'completed')
      .gte('Appointment.startTime', startOfYear)
      .lte('Appointment.startTime', endOfYear);

    const validYearPayments = (yearPayments || []).filter((p: any) => p.appointment); // Asegurar que el join fue exitoso
    const yearlyRevenue = validYearPayments
      .filter((p: any) => !isBs(p.currency))
      .reduce((s: number, p: any) => s + (p.amount || 0), 0);
    const yearlyRevenueBs = validYearPayments
      .filter((p: any) => isBs(p.currency))
      .reduce((s: number, p: any) => s + (p.amount || 0), 0);

    // ── Reprogramaciones del mes ──────────────────────────────────────────────
    const { count: rescheduledThisMonth } = await adminSupabase
      .from('Appointment')
      .select('*', { count: 'exact', head: true })
      .eq('userId', session.userId)
      .eq('status', 'reprogrammed')
      .gte('updatedAt', startOfMonth)
      .lte('updatedAt', endOfMonth);

    return NextResponse.json({
      monthlyRevenue,
      monthlyRevenueBs,
      completedAppointments: appointments.length,
      topServices,
      totalClients: totalClients || 0,
      avgTicket,
      avgTicketBs,
      yearlyRevenue,
      yearlyRevenueBs,
      rescheduledThisMonth: rescheduledThisMonth || 0,
      currency: "USD",
    });
  } catch (error) {
    console.error("[stats GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
