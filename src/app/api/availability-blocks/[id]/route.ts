import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

const patchSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  isAllDay: z.boolean().optional(),
  reason: z.string().max(300).optional(),
  blockType: z.enum(["manual", "vacation", "break"]).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  // Verificar que el bloqueo pertenece al usuario
  const { data: existing } = await supabase
    .from("AvailabilityBlock")
    .select("id")
    .eq("id", id)
    .eq("userId", session.userId)
    .single();

  if (!existing) return NextResponse.json({ error: "Bloqueo no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const { startTime, endTime, isAllDay, reason, blockType } = parsed.data;

    if (startTime && endTime && new Date(endTime) <= new Date(startTime)) {
      return NextResponse.json({ error: "La hora de fin debe ser después del inicio" }, { status: 400 });
    }

    const { data: updated, error: updateError } = await supabase
      .from("AvailabilityBlock")
      .update({
        ...(startTime && { startTime }),
        ...(endTime && { endTime }),
        ...(isAllDay !== undefined && { isAllDay }),
        ...(reason !== undefined && { reason }),
        ...(blockType && { blockType }),
        updatedAt: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) throw updateError;
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[blocks PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("AvailabilityBlock")
    .select("id")
    .eq("id", id)
    .eq("userId", session.userId)
    .single();

  if (!existing) return NextResponse.json({ error: "Bloqueo no encontrado" }, { status: 404 });

  await supabase.from("AvailabilityBlock").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
