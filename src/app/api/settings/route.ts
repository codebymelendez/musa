import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  bio: z.string().max(300).optional(),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal("")),
  serviceType: z.string().optional(),
  businessName: z.string().min(2).optional(),
  city: z.string().optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  settings: z
    .object({
      workDays: z.array(z.number().min(0).max(6)).optional(),
      startHour: z.number().min(0).max(2359).optional(),
      endHour: z.number().min(0).max(2400).optional(),
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
    const admin = createAdminClient();
    const { data: user, error } = await admin
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
      businessId: user.businessId,
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

    const { name, bio, whatsapp, instagram, avatarUrl, settings, serviceType, businessName, city, logoUrl } = parsed.data;
    // Usar admin client para todas las operaciones de escritura (bypasa RLS)
    const admin = createAdminClient();

    // 1. Manejar creación/actualización de Business
    let businessId: string | undefined;

    if (businessName) {
      const { data: currentUser } = await admin
        .from('User')
        .select('businessId')
        .eq('id', session.userId)
        .single();

      if (currentUser?.businessId) {
        // Actualizar negocio existente
        await admin
          .from('Business')
          .update({
            name: businessName,
            ...(city       !== undefined && { city:     city     || null }),
            ...(logoUrl    !== undefined && { logoUrl:  logoUrl  || null }),
            ...(serviceType !== undefined && { category: serviceType || null }),
          })
          .eq('id', currentUser.businessId);
        businessId = currentUser.businessId;
      } else {
        // Crear nuevo negocio
        const slug = businessName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        let { data: freePlan } = await admin.from('Plan').select('id').eq('name', 'FREE').single();
        if (!freePlan) {
          const limitsInfo = { appointments: 50, staff: 1, services: 10 };
          const { data: newPlan, error: planError } = await admin
            .from('Plan')
            .insert({
              id: `plan-free-${Date.now()}`,
              name: 'FREE',
              price: 0,
              currency: 'USD',
              limits: limitsInfo,
            })
            .select('id')
            .single();

          if (planError || !newPlan) {
            console.error("Error creando plan FREE:", planError);
            throw new Error("No se pudo inicializar el plan FREE");
          }
          freePlan = newPlan;
        }

        const { data: business, error: bizError } = await admin
          .from('Business')
          .insert({
            id: crypto.randomUUID(),
            name: businessName,
            slug: `${slug}-${Date.now().toString(36)}`,
            city: city || null,
            category: serviceType || null,
            planId: freePlan.id,
          })
          .select()
          .single();

        if (bizError) {
          console.error("[settings PATCH] Error creando Business:", bizError);
          throw new Error(`Error al crear el negocio: ${bizError.message}`);
        }
        businessId = business?.id;
      }
    }

    // 2. Actualizar usuario
    const userUpdate: Record<string, any> = {
      onboardingDone: true,
      updatedAt: new Date().toISOString(),
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

    await admin.from('User').update(userUpdate).eq('id', session.userId);

    // 3. Actualizar settings de horario
    if (settings) {
      await admin
        .from('ProfessionalSettings')
        .upsert({
          id: crypto.randomUUID(),
          userId: session.userId,
          workDays: settings.workDays ? JSON.stringify(settings.workDays) : "[1,2,3,4,5]",
          ...(settings.startHour !== undefined && { startHour: settings.startHour }),
          ...(settings.endHour !== undefined && { endHour: settings.endHour }),
          ...(settings.slotDuration !== undefined && { slotDuration: settings.slotDuration }),
          ...(settings.currency && { currency: settings.currency }),
          ...(settings.bookingEnabled !== undefined && { bookingEnabled: settings.bookingEnabled }),
        }, { onConflict: 'userId', ignoreDuplicates: false });
    }

    // Leer el usuario actualizado con admin client
    const { data: updated } = await admin
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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Error interno" }, { status: 500 });
  }
}
