import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

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
      .select('serviceId, service:Service(name), payment:Payment(isPaid, amount)')
      .eq('userId', session.userId)
      .eq('status', 'completed')
      .gte('startTime', startOfMonth)
      .lte('startTime', endOfMonth);

    if (appointmentsError) {
      console.error("[stats appointments error]", appointmentsError);
    }

    const appointments = completedAppointments || [];

    const monthlyRevenue = appointments.reduce((sum: number, apt: any) => {
      if (apt.payment?.isPaid) return sum + (apt.payment.amount || 0);
      return sum;
    }, 0);

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
    const paidPayments = appointments.filter((a: any) => a.payment?.isPaid);
    const avgTicket =
      paidPayments.length > 0
        ? paidPayments.reduce((s: number, a: any) => s + (a.payment?.amount ?? 0), 0) /
          paidPayments.length
        : 0;

    // ── Ingresos acumulados del año ───────────────────────────────────────────
    const startOfYear = new Date(year, 0, 1).toISOString();
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999).toISOString();

    const { data: yearPayments } = await adminSupabase
      .from('Payment')
      .select('amount, appointment:Appointment(startTime, status, userId)')
      .eq('isPaid', true)
      .eq('Appointment.userId', session.userId)
      .eq('Appointment.status', 'completed')
      .gte('Appointment.startTime', startOfYear)
      .lte('Appointment.startTime', endOfYear);

    const yearlyRevenue = (yearPayments || [])
      .filter((p: any) => p.appointment) // Asegurar que el join fue exitoso
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
      completedAppointments: appointments.length,
      topServices,
      totalClients: totalClients || 0,
      avgTicket,
      yearlyRevenue,
      rescheduledThisMonth: rescheduledThisMonth || 0,
      currency: "USD",
    });
  } catch (error) {
    console.error("[stats GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
