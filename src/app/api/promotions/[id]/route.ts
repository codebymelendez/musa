// PATCH /api/promotions/[id]  → actualizar promo
// DELETE /api/promotions/[id] → eliminar promo
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const patchSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(5).optional(),
  discount: z.number().min(1).max(100).optional(),
  validFrom: z.string().datetime().optional(),
  validUntil: z.string().datetime().optional(),
  targetUserId: z.string().cuid().optional().nullable(),
  isActive: z.boolean().optional(),
});

type Params = { params: Promise<{ id: string }> };

async function getOwnerAndPromo(req: NextRequest, id: string) {
  const session = await getSession(req);
  if (!session) return null;

  const [user, promotion] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { role: true, businessId: true } }),
    prisma.promotion.findUnique({ where: { id } }),
  ]);

  if (!user || user.role !== "OWNER" || !promotion) return null;
  if (promotion.businessId !== user.businessId) return null;

  return { user, promotion };
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

    const data = { ...parsed.data } as Record<string, unknown>;
    if (parsed.data.validFrom) data.validFrom = new Date(parsed.data.validFrom);
    if (parsed.data.validUntil) data.validUntil = new Date(parsed.data.validUntil);

    const promotion = await prisma.promotion.update({ where: { id }, data });
    return NextResponse.json({ promotion });
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
    await prisma.promotion.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[promotions DELETE]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
