import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

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
      business: user.business,
      settings: s
        ? { ...s, workDays: JSON.parse(s.workDays || "[1,2,3,4,5]") }
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
