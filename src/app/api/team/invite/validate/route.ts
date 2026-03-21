import { NextRequest, NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return NextResponse.json({ error: "Token faltante" }, { status: 400 });

  try {
    const invitation = await prisma.invitation.findUnique({
      where: { token, usedAt: null },
      include: { business: { select: { name: true } } },
    });

    if (!invitation || (invitation.expiresAt && invitation.expiresAt < new Date())) {
      return NextResponse.json({ error: "Invitación inválida o expirada" }, { status: 404 });
    }

    return NextResponse.json({ business: invitation.business });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
