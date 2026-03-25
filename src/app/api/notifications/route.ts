import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const supabase = await createClient();
    const { data: notifications, error } = await supabase
      .from('Notification')
      .select('*')
      .eq('userId', session.userId)
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
    const supabase = await createClient();

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
