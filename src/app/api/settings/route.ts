import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().max(300).optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  serviceType: z.string().optional(),
  businessName: z.string().min(2).optional(),
  city: z.string().optional(),
  settings: z
    .object({
      workDays: z.array(z.number().min(0).max(6)).optional(),
      startHour: z.number().min(0).max(23).optional(),
      endHour: z.number().min(1).max(24).optional(),
      slotDuration: z.number().min(15).max(120).optional(),
      currency: z.string().optional(),
      bookingEnabled: z.boolean().optional(),
    })
    .optional(),
});

export async function GET(req: NextRequest) {
  const response = NextResponse.json({ user: null });
  const session = await getSession(req, response);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const supabase = await createClient(req, response);
    const { data: user, error } = await supabase
      .from('User')
      .select('*, settings:ProfessionalSettings(*), business:Business(*, plan:Plan(*))')
      .eq('id', session.userId)
      .single();

    if (error || !user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

    const userToReturn = {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      slug: user.slug,
      role: user.role,
      serviceType: user.serviceType,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      whatsapp: user.whatsapp,
      instagram: user.instagram,
      onboardingDone: user.onboardingDone,
      business: user.business,
      settings: user.settings
        ? { ...user.settings, workDays: JSON.parse(user.settings.workDays || "[1,2,3,4,5]") }
        : null,
    };

    return new NextResponse(JSON.stringify(userToReturn), {
      status: 200,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[settings GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const response = NextResponse.json({ ok: true });
  const session = await getSession(req, response);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { name, bio, whatsapp, instagram, avatarUrl, settings, serviceType, businessName, city } = parsed.data;
    const supabase = await createClient(req, response);

    // 1. Manejar creación/actualización de Business
    let businessId: string | undefined;

    if (businessName) {
      const { data: currentUser } = await supabase
        .from('User')
        .select('businessId')
        .eq('id', session.userId)
        .single();

      if (currentUser?.businessId) {
        // Actualizar negocio existente
        const { data: business } = await supabase
          .from('Business')
          .update({
            name: businessName,
            ...(city !== undefined && { city: city || null }),
          })
          .eq('id', currentUser.businessId)
          .select()
          .single();
        businessId = business?.id;
      } else {
        // Crear nuevo negocio
        const slug = businessName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        const { data: freePlan } = await supabase.from('Plan').select('id').eq('name', 'FREE').single();
        if (!freePlan) throw new Error("Plan FREE no inicializado");

        const { data: business } = await supabase
          .from('Business')
          .insert({
            name: businessName,
            slug: `${slug}-${Date.now().toString(36)}`,
            city: city || null,
            planId: freePlan.id,
          })
          .select()
          .single();
        businessId = business?.id;
      }
    }

    // 2. Actualizar usuario
    const userUpdate: Record<string, any> = {
      onboardingDone: true,
    };
    if (name) userUpdate.name = name;
    if (bio !== undefined) userUpdate.bio = bio;
    if (whatsapp !== undefined) userUpdate.whatsapp = whatsapp;
    if (instagram !== undefined) userUpdate.instagram = instagram;
    if (avatarUrl !== undefined) userUpdate.avatarUrl = avatarUrl || null;
    if (serviceType) userUpdate.serviceType = serviceType;
    if (businessId) {
      userUpdate.businessId = businessId;
      userUpdate.role = "OWNER";
    }

    await supabase.from('User').update(userUpdate).eq('id', session.userId);

    // 3. Actualizar settings de horario
    if (settings) {
      const settingsUpdate: Record<string, any> = {};
      if (settings.workDays) settingsUpdate.workDays = JSON.stringify(settings.workDays);
      if (settings.startHour !== undefined) settingsUpdate.startHour = settings.startHour;
      if (settings.endHour !== undefined) settingsUpdate.endHour = settings.endHour;
      if (settings.slotDuration !== undefined) settingsUpdate.slotDuration = settings.slotDuration;
      if (settings.currency) settingsUpdate.currency = settings.currency;
      if (settings.bookingEnabled !== undefined) settingsUpdate.bookingEnabled = settings.bookingEnabled;

      await supabase
        .from('ProfessionalSettings')
        .upsert({
          userId: session.userId,
          workDays: settings.workDays ? JSON.stringify(settings.workDays) : "[1,2,3,4,5]",
          ...settingsUpdate,
        }, { onConflict: 'userId' });
    }

    const { data: updated } = await supabase
      .from('User')
      .select('*, settings:ProfessionalSettings(*), business:Business(*)')
      .eq('id', session.userId)
      .single();

    const result = {
      ...updated,
      settings: updated?.settings
        ? { ...updated.settings, workDays: JSON.parse(updated.settings.workDays || "[1,2,3,4,5]") }
        : null,
    };

    return new NextResponse(JSON.stringify(result), {
      status: 200,
      headers: response.headers,
    });
  } catch (error) {
    console.error("[settings PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

