import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search");

  try {
    const supabase = await createClient();
    let query = supabase
      .from('Client')
      .select('*, appointments:Appointment(*, service:Service(*))')
      .eq('userId', session.userId)
      .order('name', { ascending: true });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data: clients, error } = await query;

    if (error) {
       console.error("[clients fetch error]", error);
       return NextResponse.json({ error: "Error al obtener clientes" }, { status: 500 });
    }

    // Limitamos citas a 5 por cliente en JS (para imitar Prisma 'take: 5')
    const processedClients = (clients || []).map(client => ({
      ...client,
      appointments: (client.appointments || [])
        .sort((a: any, b: any) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 5)
    }));

    return NextResponse.json(processedClients);
  } catch (error) {
    console.error("[clients GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
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

    const { name, phone, email, notes } = parsed.data;
    const supabase = await createClient();

    // Upsert: si ya existe la clienta con ese teléfono, actualizar
    const { data: client, error } = await supabase
      .from('Client')
      .upsert({
        userId: session.userId,
        name,
        phone,
        email: email || null,
        notes,
      }, { onConflict: 'userId,phone' })
      .select()
      .single();

    if (error) {
       console.error("[client upsert error]", error);
       return NextResponse.json({ error: "Error al registrar cliente" }, { status: 500 });
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("[clients POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
