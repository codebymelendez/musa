import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  preferences: z.string().optional(),
  birthday: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function getBusinessId(supabase: any, userId: string) {
  const { data } = await supabase
    .from("User")
    .select("businessId")
    .eq("id", userId)
    .single();
  return data?.businessId as string | null;
}

// PATCH /api/clients/[id] — editar clienta
export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const businessId = await getBusinessId(supabase, session.userId);
    if (!businessId) {
      return NextResponse.json({ error: "El usuario no pertenece a un negocio" }, { status: 400 });
    }

    // Solo actualizar si la clienta pertenece al mismo negocio
    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };
    const d = parsed.data;
    if (d.name !== undefined)        updateData.name        = d.name;
    if (d.phone !== undefined)       updateData.phone       = d.phone;
    if (d.email !== undefined)       updateData.email       = d.email || null;
    if (d.notes !== undefined)       updateData.notes       = d.notes;
    if (d.preferences !== undefined) updateData.preferences = d.preferences;
    if (d.birthday !== undefined)    updateData.birthday    = d.birthday || null;
    if (d.tags !== undefined)        updateData.tags        = d.tags;
    if (d.isActive !== undefined)    updateData.isActive    = d.isActive;

    const { data: updated, error } = await supabase
      .from("Client")
      .update(updateData)
      .eq("id", id)
      .eq("businessId", businessId)
      .select()
      .single();

    if (error) {
      console.error("[client PATCH error]", error);
      return NextResponse.json({ error: "Error al actualizar clienta" }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[client PATCH]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// DELETE /api/clients/[id] — baja lógica (isActive = false)
export async function DELETE(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;

  try {
    const supabase = await createClient();
    const businessId = await getBusinessId(supabase, session.userId);
    if (!businessId) {
      return NextResponse.json({ error: "El usuario no pertenece a un negocio" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from("Client")
      .update({ isActive: false, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .eq("businessId", businessId)
      .select("id, name, isActive")
      .single();

    if (error || !updated) {
      console.error("[client DELETE error]", error);
      return NextResponse.json({ error: "Error al archivar clienta" }, { status: 500 });
    }

    return NextResponse.json({ success: true, client: updated });
  } catch (err) {
    console.error("[client DELETE]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
