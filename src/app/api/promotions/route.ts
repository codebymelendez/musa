import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

const createSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional().default(""),
  discount: z.number().min(1).max(100),
  validFrom: z.string().datetime(),
  validUntil: z.string().datetime(),
  targetUserId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const { data: user } = await admin
      .from('User')
      .select('businessId')
      .eq('id', session.userId)
      .single();

    if (!user?.businessId) {
      return NextResponse.json({ promotions: [] });
    }

    const { data: promotions, error } = await admin
      .from('Promotion')
      .select('*')
      .eq('businessId', user.businessId)
      .order('createdAt', { ascending: false });

    if (error) {
       console.error("[promotions fetch error]", error);
       return NextResponse.json({ error: "Error al obtener promociones" }, { status: 500 });
    }

    return NextResponse.json({ promotions });
  } catch (error) {
    console.error("[promotions GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const admin = createAdminClient();
    const { data: user } = await admin
      .from('User')
      .select('appRole, businessId')
      .eq('id', session.userId)
      .single();

    if (user?.appRole !== "owner") {
      return NextResponse.json({ error: "Solo el propietario puede crear promociones" }, { status: 403 });
    }

    if (!user.businessId) {
      return NextResponse.json({ error: "Sin negocio asignado" }, { status: 400 });
    }

    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { data: promotion, error: createError } = await admin
      .from('Promotion')
      .insert({
        ...parsed.data,
        id: crypto.randomUUID(),
        businessId: user.businessId,
        validFrom: new Date(parsed.data.validFrom).toISOString(),
        validUntil: new Date(parsed.data.validUntil).toISOString(),
      })
      .select()
      .single();

    if (createError) {
       console.error("[promotion create error]", createError);
       return NextResponse.json({ error: "Error al crear promoción" }, { status: 500 });
    }

    return NextResponse.json({ promotion }, { status: 201 });
  } catch (error) {
    console.error("[promotions POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
