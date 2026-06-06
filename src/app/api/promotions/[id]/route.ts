import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(1).optional(),
  discount: z.number().min(1).max(100).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  targetUserId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function getOwnerAndPromo(req: NextRequest, id: string) {
  const session = await getSession(req);
  if (!session) return null;

  const supabase = await createClient();
  const [{ data: user }, { data: promotion }] = await Promise.all([
    supabase.from('User').select('appRole, businessId').eq('id', session.userId).single(),
    supabase.from('Promotion').select('*').eq('id', id).single(),
  ]);

  if (!user || user.appRole !== "owner" || !promotion) return null;
  if (promotion.businessId !== user.businessId) return null;

  return { user, promotion, supabase };
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const ctx = await getOwnerAndPromo(req, id);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const data = { ...parsed.data } as Record<string, any>;
    if (parsed.data.validFrom) data.validFrom = new Date(parsed.data.validFrom).toISOString();
    if (parsed.data.validUntil) data.validUntil = new Date(parsed.data.validUntil).toISOString();

    const { data: updated, error } = await ctx.supabase
      .from('Promotion')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ promotion: updated });
  } catch (error) {
    console.error("[promotions PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const ctx = await getOwnerAndPromo(req, id);
  if (!ctx) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  try {
    const { error } = await ctx.supabase.from('Promotion').delete().eq('id', id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[promotions DELETE]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
