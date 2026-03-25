import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  category: z.enum(["nails", "hair", "brows", "makeup", "other"]).optional(),
  durationMin: z.number().int().positive().optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const supabase = await createClient();
  const { data: service } = await supabase
    .from('Service')
    .select('*')
    .eq('id', id)
    .eq('userId', session.userId)
    .maybeSingle();

  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  return NextResponse.json(service);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const supabase = await createClient();
  const { data: service } = await supabase
    .from('Service')
    .select('id')
    .eq('id', id)
    .eq('userId', session.userId)
    .maybeSingle();

  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('Service')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[services PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const supabase = await createClient();
  const { data: service } = await supabase
    .from('Service')
    .select('id')
    .eq('id', id)
    .eq('userId', session.userId)
    .maybeSingle();

  if (!service) return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });

  // Soft delete
  const { error } = await supabase
    .from('Service')
    .update({ isActive: false })
    .eq('id', id);

  if (error) throw error;

  return NextResponse.json({ ok: true });
}
