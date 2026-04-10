import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";

const createSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(7),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().optional(),
  preferences: z.string().optional(),
  birthday: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional().default(true),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search        = searchParams.get("search");
  const showInactive  = searchParams.get("showInactive") === "true";

  try {
    const supabase = await createClient();

    // Obtener businessId del usuario
    const { data: userData } = await supabase.from('User').select('businessId').eq('id', session.userId).single();
    const businessId = userData?.businessId;

    if (!businessId) {
      return NextResponse.json({ error: "El usuario no pertenece a un negocio" }, { status: 400 });
    }

    let query = supabase
      .from('Client')
      .select('*, appointments:Appointment(*, service:Service(*))')
      .eq('businessId', businessId)
      .order('name', { ascending: true });

    // Si NO se pide ver inactivas, filtrar solo activas
    if (!showInactive) {
      query = query.eq('isActive', true);
    }

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

    const { name, phone, email, notes, preferences, birthday, tags, isActive } = parsed.data;
    const supabase = await createClient();

    // Obtener businessId del usuario
    const { data: userData } = await supabase.from('User').select('businessId').eq('id', session.userId).single();
    const businessId = userData?.businessId;

    if (!businessId) {
      return NextResponse.json({ error: "El usuario no pertenece a un negocio" }, { status: 400 });
    }

    // Buscar si ya existe la clienta con ese teléfono para este negocio
    const { data: existingClient } = await supabase
      .from('Client')
      .select('id')
      .eq('businessId', businessId)
      .eq('phone', phone)
      .maybeSingle();

    let client;
    if (existingClient) {
      const { data: updatedClient, error: updateError } = await supabase
        .from('Client')
        .update({
          name,
          email: email || null,
          notes,
          preferences,
          birthday: birthday || null,
          tags: tags || [],
          isActive,
          updatedAt: new Date().toISOString(),
        })
        .eq('id', existingClient.id)
        .select()
        .single();

      if (updateError) {
         console.error("[client update error]", updateError);
         return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 500 });
      }
      client = updatedClient;
    } else {
      const { data: newClient, error: insertError } = await supabase
        .from('Client')
        .insert({
          id: crypto.randomUUID(),
          businessId: businessId,
          userId: session.userId, // quien lo creó
          name,
          phone,
          email: email || null,
          notes,
          preferences,
          birthday: birthday || null,
          tags: tags || [],
          isActive
        })
        .select()
        .single();

      if (insertError) {
         console.error("[client insert error]", insertError);
         return NextResponse.json({ error: "Error al registrar cliente" }, { status: 500 });
      }
      client = newClient;
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("[clients POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
