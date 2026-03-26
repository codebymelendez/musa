import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getClientSession } from "@/lib/clientAuth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  const authHeader = req.headers.get("Authorization");
  const clientSession = await getClientSession(authHeader);

  if (!session && !clientSession) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    let query = supabase.from('Notification').select('*');

    if (session) {
      query = query.eq('userId', session.userId);
    } else if (clientSession) {
      const { data: clients } = await supabase
        .from('Client')
        .select('id')
        .eq('phone', clientSession.clientPhone);

      const clientIds = (clients ?? []).map((c: { id: string }) => c.id);
      if (clientIds.length === 0) return NextResponse.json([]);
      query = query.in('clientId', clientIds);
    }

    const { data: notifications, error } = await query
      .order('createdAt', { ascending: false })
      .limit(50);

    if (error) {
      console.error("[notifications fetch error]", error);
      return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 });
    }

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("[notifications GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const { id, readAll } = body;
    const supabase = createAdminClient();

    if (readAll) {
      const { error } = await supabase
        .from('Notification')
        .update({ read: true, readAt: new Date().toISOString() })
        .eq('userId', session.userId)
        .eq('read', false);
      
      if (error) throw error;
    } else if (id) {
      const { error } = await supabase
        .from('Notification')
        .update({ read: true, readAt: new Date().toISOString() })
        .eq('id', id)
        .eq('userId', session.userId);
      
      if (error) throw error;
    } else {
      return NextResponse.json({ error: "Parámetro id o readAll requerido" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[notifications PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
