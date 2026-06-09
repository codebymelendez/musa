import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { parseBusinessHoursToSettings } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const response = NextResponse.json({ user: null });
  const session = await getSession(req, response);
  
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: user, error } = await admin
      .from('User')
      .select('*, settings:ProfessionalSettings(*), business:Business(*, plan:Plan(*))')
      .eq('id', session.userId)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const s = Array.isArray(user.settings) ? user.settings[0] : user.settings;

    let bizHours = null;
    let latestPayment = null;

    if (user.businessId) {
      const [{ data: hours }, { data: payData }] = await Promise.all([
        admin
          .from('BusinessHours')
          .select('*')
          .eq('businessId', user.businessId)
          .is('userId', null),
        admin
          .from('SubscriptionPayment')
          .select('*, plan:Plan(name)')
          .eq('businessId', user.businessId)
          .order('createdAt', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);
      bizHours = hours;
      if (payData) {
        latestPayment = {
          ...payData,
          plan: Array.isArray(payData.plan) ? payData.plan[0] : payData.plan
        };
      }
    }
    const computedHours = parseBusinessHoursToSettings(bizHours);

    const rawBiz = user.business;
    const businessToReturn = rawBiz ? {
      ...rawBiz,
      plan: Array.isArray(rawBiz.plan) ? rawBiz.plan[0] : rawBiz.plan
    } : null;

    const userToReturn = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      slug: user.slug,
      appRole: user.appRole ?? "owner",
      serviceType: user.serviceType,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      whatsapp: user.whatsapp,
      instagram: user.instagram,
      onboardingDone: user.onboardingDone,
      businessId: user.businessId,
      business: businessToReturn,
      latestPayment,
      isAdmin: user.isAdmin,
      settings: s
        ? {
            ...s,
            workDays: computedHours.workDays,
            startHour: computedHours.startHour,
            endHour: computedHours.endHour,
            paymentMethods: s.paymentMethods ? JSON.parse(s.paymentMethods) : [],
          }
        : null,
    };

    return new NextResponse(JSON.stringify(userToReturn), {
      status: 200,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[me GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
