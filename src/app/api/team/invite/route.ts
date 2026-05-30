import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('User')
      .select('appRole, businessId')
      .eq('id', session.userId)
      .single();

    if (user?.appRole !== "owner" || !user.businessId) {
      return NextResponse.json({ error: "Solo el dueño puede invitar personal" }, { status: 403 });
    }

    // Generar token único y código alfanumérico corto
    const token = nanoid(32);
    const code = nanoid(8).toUpperCase();

    const { data: invitation, error } = await supabase
      .from('Invitation')
      .insert({
        businessId: user.businessId,
        token,
        code,
        role: "STAFF",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días
      })
      .select()
      .single();

    if (error) {
       console.error("[team invite create error]", error);
       return NextResponse.json({ error: "Error al crear invitación" }, { status: 500 });
    }

    return NextResponse.json(invitation);
  } catch (error) {
    console.error("[team invite POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const supabase = await createClient();
    const { data: user } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', session.userId)
      .single();

    if (!user?.businessId) return NextResponse.json([]);

    const { data: invitations, error } = await supabase
      .from('Invitation')
      .select('*')
      .eq('businessId', user.businessId)
      .is('usedAt', null)
      .or(`expiresAt.is.null,expiresAt.gt.${new Date().toISOString()}`)
      .order('createdAt', { ascending: false });

    if (error) {
       console.error("[team invites fetch error]", error);
       return NextResponse.json({ error: "Error al obtener invitaciones" }, { status: 500 });
    }

    return NextResponse.json(invitations);
  } catch (error) {
    console.error("[team invite GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
