import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(7).optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  try {
    const supabase = await createClient();
    const { data: client, error } = await supabase
      .from('Client')
      .select('*, appointments:Appointment(*, service:Service(*), payment:Payment(*))')
      .eq('id', id)
      .eq('userId', session.userId)
      .single();

    if (error || !client) return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });
    
    // Ordenar citas en JS
    client.appointments = (client.appointments || [])
      .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

    return NextResponse.json(client);
  } catch (error) {
    console.error("[client GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  try {
    const supabase = await createClient();
    
    // Verificar propiedad
    const { data: client } = await supabase
      .from('Client')
      .select('id')
      .eq('id', id)
      .eq('userId', session.userId)
      .single();

    if (!client) return NextResponse.json({ error: "Clienta no encontrada" }, { status: 404 });

    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
    }

    const { data: updated, error } = await supabase
      .from('Client')
      .update({
        ...parsed.data,
        email: parsed.data.email || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
       console.error("[client update error]", error);
       return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[clients PATCH]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
