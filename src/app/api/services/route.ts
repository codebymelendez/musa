import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

const createSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  description: z.string().optional(),
  category: z.enum(["nails", "hair", "brows", "makeup", "other"]),
  durationMin: z.number().int().positive("La duración debe ser mayor a 0"),
  price: z.number().nonnegative("El precio no puede ser negativo"),
  currency: z.string().default("USD"),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const { data: services, error } = await admin
      .from('Service')
      .select('*')
      .eq('userId', session.userId)
      .eq('isActive', true)
      .order('createdAt', { ascending: true });

    if (error) {
       console.error("[services fetch error]", error);
       return NextResponse.json({ error: "Error al obtener servicios" }, { status: 500 });
    }

    return NextResponse.json(services);
  } catch (error) {
    console.error("[services GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = createSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    
    // Obtener el businessId del usuario
    const { data: userProfile } = await admin
      .from('User')
      .select('businessId')
      .eq('id', session.userId)
      .single();

    if (!userProfile?.businessId) {
      return NextResponse.json({ error: "No tienes un negocio configurado" }, { status: 400 });
    }

    const { data: service, error } = await admin
      .from('Service')
      .insert({ 
        ...parsed.data, 
        id: crypto.randomUUID(),
        userId: session.userId,
        businessId: userProfile.businessId 
      })
      .select()
      .single();

    if (error) {
       console.error("[service create error]", error);
       return NextResponse.json({ error: "Error al crear servicio" }, { status: 500 });
    }

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    console.error("[services POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
