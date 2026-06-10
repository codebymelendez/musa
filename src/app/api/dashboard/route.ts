import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { toLocalDate, dayRangeUTC, weekRangeUTC, DEFAULT_TZ } from "@/lib/utils";
import { isBs } from "@/lib/currency";

export async function GET(req: NextRequest) {
  const response = NextResponse.json({ user: null });
  const session = await getSession(req, response);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const { data: user, error: userError } = await admin
      .from('User')
      .select('*, business:Business(*)')
      .eq('id', session.userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const businessTz = user.business?.timezone || DEFAULT_TZ;
    const userName = user.name?.split(' ')[0] ?? '';
    const avatarUrl = user.avatarUrl ?? null;
    const businessId = user.businessId;

    // Default structure if no business is assigned
    if (!businessId) {
      return NextResponse.json({
        businessTz,
        userName,
        avatarUrl,
        appointments: [],
        promos: [],
        loyaltyProgram: null,
        loyaltyStats: { clientsWithPoints: 0, totalPoints: 0 },
        monthlyRevenue: 0,
        monthlyRevenueBs: 0,
        weeklyRevenue: 0,
        weeklyRevenueBs: 0,
        newClientsCount: 0,
      }, {
        headers: response.headers,
      });
    }

    const now = new Date();
    
    // Dates calculation based on business timezone
    const localStr = toLocalDate(now, businessTz); // YYYY-MM-DD
    const { start: todayStart, end: todayEnd } = dayRangeUTC(localStr, businessTz);

    const [year, month] = localStr.split('-').map(Number);
    const startOfMonthStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endOfMonthStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    const { start: startOfMonth, end: endOfMonth } = dayRangeUTC(startOfMonthStr, businessTz);

    const { start: weekStart, end: weekEnd } = weekRangeUTC(now, businessTz);

    // Run all database queries in parallel
    const [
      appointmentsRes,
      promotionsRes,
      loyaltyProgramRes,
      loyaltyAccountsRes,
      monthlyRevenueRes,
      newClientsCountRes,
      weeklyRevenueRes,
    ] = await Promise.all([
      // 1. Today's appointments
      admin
        .from('Appointment')
        .select('*, client:Client(*), service:Service(*), payment:Payment(*)')
        .eq('userId', session.userId)
        .gte('startTime', todayStart)
        .lte('startTime', todayEnd)
        .order('startTime', { ascending: true }),

      // 2. Promotions
      admin
        .from('Promotion')
        .select('*')
        .eq('businessId', businessId)
        .order('createdAt', { ascending: false }),

      // 3. Loyalty Program config
      admin
        .from('LoyaltyProgram')
        .select('*')
        .eq('businessId', businessId)
        .maybeSingle(),

      // 4. Loyalty Accounts
      admin
        .from('ClientLoyaltyAccount')
        .select('totalPoints')
        .eq('businessId', businessId)
        .gt('totalPoints', 0),

      // 5. Monthly Revenue (Completed appointments payments)
      admin
        .from('Appointment')
        .select('payment:Payment(isPaid, amount, currency)')
        .eq('userId', session.userId)
        .eq('status', 'completed')
        .gte('startTime', startOfMonth)
        .lte('startTime', endOfMonth),

      // 6. New Clients Count
      admin
        .from('Client')
        .select('*', { count: 'exact', head: true })
        .eq('userId', session.userId)
        .gte('createdAt', startOfMonth),

      // 7. Weekly Revenue (Completed appointments this week)
      admin
        .from('Appointment')
        .select('service:Service(price, currency), payment:Payment(isPaid, amount, currency)')
        .eq('userId', session.userId)
        .eq('status', 'completed')
        .gte('startTime', weekStart)
        .lte('startTime', weekEnd),
    ]);

    // Format one-to-one relations for today's appointments
    const formattedAppts = (appointmentsRes.data || [])
      .map((apt: any) => ({
        ...apt,
        client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
        payment: Array.isArray(apt.payment) ? apt.payment[0] : apt.payment,
      }))
      .filter((apt: any) => apt.status !== 'cancelled');

    // Filter active promotions
    const activePromos = (promotionsRes.data || []).filter((promo: any) => {
      if (!promo.validFrom && !promo.validUntil) return true;
      const from = promo.validFrom ? new Date(promo.validFrom) : null;
      const until = promo.validUntil ? new Date(promo.validUntil) : null;
      if (from && now < from) return false;
      if (until && now > until) return false;
      return true;
    });

    // Compute loyalty stats
    const accounts = loyaltyAccountsRes.data || [];
    const loyaltyStats = {
      clientsWithPoints: accounts.length,
      totalPoints: accounts.reduce((sum: number, acc: any) => sum + (acc.totalPoints || 0), 0),
    };

    // Calculate monthly revenue — totales separados por moneda, nunca se mezclan
    let monthlyRevenue = 0;
    let monthlyRevenueBs = 0;
    for (const apt of (monthlyRevenueRes.data || []) as any[]) {
      const payment = Array.isArray(apt.payment) ? apt.payment[0] : apt.payment;
      if (!payment?.isPaid) continue;
      if (isBs(payment.currency)) monthlyRevenueBs += payment.amount || 0;
      else monthlyRevenue += payment.amount || 0;
    }

    // Calculate weekly revenue (using payment if paid, or service price if not).
    // El fallback de service.price cuenta en la moneda del servicio (Service.currency).
    let weeklyRevenue = 0;
    let weeklyRevenueBs = 0;
    for (const apt of (weeklyRevenueRes.data || []) as any[]) {
      const service = Array.isArray(apt.service) ? apt.service[0] : apt.service;
      const payment = Array.isArray(apt.payment) ? apt.payment[0] : apt.payment;

      const isPaid = payment?.isPaid ?? false;
      const amount = isPaid ? (payment?.amount ?? 0) : (service?.price ?? 0);
      const currency = isPaid ? payment?.currency : service?.currency;

      if (isBs(currency)) weeklyRevenueBs += amount;
      else weeklyRevenue += amount;
    }

    return new NextResponse(
      JSON.stringify({
        businessTz,
        userName,
        avatarUrl,
        appointments: formattedAppts,
        promos: activePromos,
        loyaltyProgram: loyaltyProgramRes.data ?? null,
        loyaltyStats,
        monthlyRevenue,
        monthlyRevenueBs,
        weeklyRevenue,
        weeklyRevenueBs,
        newClientsCount: newClientsCountRes.count ?? 0,
      }),
      {
        status: 200,
        headers: response.headers,
      }
    );
  } catch (error) {
    console.error("[dashboard GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
