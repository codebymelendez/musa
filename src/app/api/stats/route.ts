// GET /api/stats?period=month&year=2025&month=3

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const now = new Date();
  const year = parseInt(searchParams.get("year") ?? String(now.getFullYear()));
  const month = parseInt(searchParams.get("month") ?? String(now.getMonth() + 1));

  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  try {
    // ── Citas completadas del mes ─────────────────────────────────────────────
    const completedAppointments = await prisma.appointment.findMany({
      where: {
        userId: session.userId,
        status: "completed",
        startTime: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { service: true, payment: true },
    });

    // ── Ingresos del mes ──────────────────────────────────────────────────────
    const monthlyRevenue = completedAppointments.reduce((sum, apt) => {
      if (apt.payment?.isPaid) return sum + apt.payment.amount;
      return sum;
    }, 0);

    // ── Top 3 servicios ───────────────────────────────────────────────────────
    const serviceCounts: Record<string, { name: string; count: number }> = {};
    for (const apt of completedAppointments) {
      const key = apt.serviceId;
      if (!serviceCounts[key]) {
        serviceCounts[key] = { name: apt.service.name, count: 0 };
      }
      serviceCounts[key].count++;
    }

    const topServices = Object.values(serviceCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(({ name, count }) => ({ serviceName: name, count }));

    // ── Total de clientas ─────────────────────────────────────────────────────
    const totalClients = await prisma.client.count({
      where: { userId: session.userId },
    });

    // ── Ticket promedio ───────────────────────────────────────────────────────
    const paidPayments = completedAppointments.filter((a) => a.payment?.isPaid);
    const avgTicket =
      paidPayments.length > 0
        ? paidPayments.reduce((s, a) => s + (a.payment?.amount ?? 0), 0) /
          paidPayments.length
        : 0;

    // ── Ingresos acumulados del año ───────────────────────────────────────────
    const startOfYear = new Date(year, 0, 1);
    const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

    const yearPayments = await prisma.payment.findMany({
      where: {
        isPaid: true,
        appointment: {
          userId: session.userId,
          startTime: { gte: startOfYear, lte: endOfYear },
          status: "completed",
        },
      },
    });

    const yearlyRevenue = yearPayments.reduce((s, p) => s + p.amount, 0);

    return NextResponse.json({
      monthlyRevenue,
      completedAppointments: completedAppointments.length,
      topServices,
      totalClients,
      avgTicket,
      yearlyRevenue,
      currency: "USD",
    });
  } catch (error) {
    console.error("[stats GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
