import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { detectConflictingAppointments } from "@/lib/availability";

const createSchema = z.object({
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  isAllDay: z.boolean().optional().default(false),
  reason: z.string().max(300).optional(),
  blockType: z.enum(["manual", "vacation", "break"]).optional().default("manual"),
  // force=true: el cliente ha confirmado que quiere guardar aunque haya conflictos
  force: z.boolean().optional().default(false),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = createAdminClient();
  let query = supabase
    .from("AvailabilityBlock")
    .select("*")
    .eq("userId", session.userId)
    .order("startTime", { ascending: true });

  if (from) query = query.gte("startTime", new Date(from).toISOString());
  if (to) query = query.lte("startTime", new Date(to).toISOString());

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Error al cargar bloqueos" }, { status: 500 });

  return NextResponse.json(data ?? []);
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

    const { startTime, endTime, isAllDay, reason, blockType, force } = parsed.data;
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end <= start) {
      return NextResponse.json({ error: "La hora de fin debe ser después del inicio" }, { status: 400 });
    }

    // Detectar citas en conflicto
    const conflicts = await detectConflictingAppointments(session.userId, start, end);

    if (conflicts.length > 0 && !force) {
      return NextResponse.json(
        {
          error: "conflict",
          message: `Este bloqueo afecta ${conflicts.length} cita(s) existente(s)`,
          conflicts,
        },
        { status: 409 }
      );
    }

    // Obtener businessId del usuario
    const supabase = createAdminClient();
    const { data: user } = await supabase
      .from("User")
      .select("businessId")
      .eq("id", session.userId)
      .single();

    if (!user?.businessId) {
      return NextResponse.json({ error: "Usuario sin negocio" }, { status: 400 });
    }

    const { data: block, error: insertError } = await supabase
      .from("AvailabilityBlock")
      .insert({
        id: crypto.randomUUID(),
        userId: session.userId,
        businessId: user.businessId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        isAllDay: isAllDay ?? false,
        reason: reason ?? null,
        blockType,
      })
      .select("*")
      .single();

    if (insertError) {
      console.error("[blocks POST]", insertError);
      return NextResponse.json({ error: "Error al crear bloqueo" }, { status: 500 });
    }

    return NextResponse.json(block, { status: 201 });
  } catch (err) {
    console.error("[blocks POST]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
