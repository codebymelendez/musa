import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

const upsertSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
  accumulationType: z.enum(["visits", "points"]).optional(),
  pointsPerVisit: z.number().int().min(1).max(100).optional(),
  rewardThreshold: z.number().int().min(1).max(1000).optional(),
  rewardDescription: z.string().max(300).optional(),
  validUntil: z.string().nullable().optional(),
});

async function getBusinessId(userId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("User").select("businessId").eq("id", userId).single();
  return data?.businessId ?? null;
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const businessId = await getBusinessId(session.userId);
  if (!businessId) return NextResponse.json({ error: "Sin negocio" }, { status: 400 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("LoyaltyProgram")
    .select("*")
    .eq("businessId", businessId)
    .maybeSingle();

  return NextResponse.json({ program: data ?? null });
}

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const businessId = await getBusinessId(session.userId);
  if (!businessId) return NextResponse.json({ error: "Sin negocio" }, { status: 400 });

  // Solo OWNER puede configurar el programa
  const supabase = createAdminClient();
  const { data: user } = await supabase
    .from("User")
    .select("role")
    .eq("id", session.userId)
    .single();

  if (user?.role !== "OWNER") {
    return NextResponse.json({ error: "Solo el propietario puede configurar el programa" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const parsed = upsertSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    // Check if program already exists to decide whether to INSERT or UPDATE
    const { data: existing } = await supabase
      .from("LoyaltyProgram")
      .select("id")
      .eq("businessId", businessId)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      businessId,
      name: parsed.data.name ?? "Programa de Fidelización",
      isActive: parsed.data.isActive ?? true,
      accumulationType: parsed.data.accumulationType ?? "visits",
      pointsPerVisit: parsed.data.pointsPerVisit ?? 1,
      rewardThreshold: parsed.data.rewardThreshold ?? 10,
      rewardDescription: parsed.data.rewardDescription ?? "",
      validUntil: parsed.data.validUntil ?? null,
      updatedAt: new Date().toISOString(),
    };

    // id is required on INSERT; on UPDATE we use the existing id
    if (!existing) {
      payload.id = randomUUID();
    } else {
      payload.id = existing.id;
    }

    const { data: program, error } = await supabase
      .from("LoyaltyProgram")
      .upsert(payload, { onConflict: "businessId" })
      .select("*")
      .single();

    if (error) {
      console.error("[loyalty/program POST]", error);
      return NextResponse.json({ error: "Error al guardar el programa" }, { status: 500 });
    }

    return NextResponse.json({ program });
  } catch (err) {
    console.error("[loyalty/program POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
