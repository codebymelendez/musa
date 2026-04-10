import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

function normalizePhone(phone: string) {
  return phone.replace(/\D/g, "");
}

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
    // Usamos el cliente ADMIN para asegurar visibilidad sin depender de RLS
    const adminSupabase = createAdminClient();

    // Obtener businessId del usuario (usando admin para asegurar lectura)
    const { data: userData } = await adminSupabase.from('User').select('businessId').eq('id', session.userId).single();
    const businessId = userData?.businessId;

    if (!businessId) {
      return NextResponse.json({ error: "El usuario no pertenece a un negocio" }, { status: 400 });
    }

    let query = adminSupabase
      .from('Client')
      .select('*, appointments:Appointment(*, service:Service(*))')
      .eq('businessId', businessId)
      .order('name', { ascending: true });

    // Si NO se pide ver inactivas, filtrar solo activas
    if (!showInactive) {
      query = query.eq('isActive', true);
    }

    if (search) {
      // Si parece un teléfono o tiene muchos números, normalizamos la búsqueda por teléfono
      const normalizedSearch = normalizePhone(search);
      if (normalizedSearch && normalizedSearch.length >= 3) {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${normalizedSearch}%`);
      } else {
        query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      }
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
    const normalizedPhone = normalizePhone(phone);
    
    // Usamos el cliente normal para verificar sesión/negocio del usuario
    const supabase = await createClient();
    
    // Usamos el cliente ADMIN para operaciones sobre la tabla Client
    // Esto asegura que el staff pueda gestionar clientes incluso con RLS restrictivo
    const adminSupabase = createAdminClient();

    // Obtener businessId del usuario (usando cliente normal por seguridad)
    const { data: userData } = await supabase.from('User').select('businessId').eq('id', session.userId).single();
    const businessId = userData?.businessId;

    if (!businessId) {
      return NextResponse.json({ error: "El usuario no pertenece a un negocio" }, { status: 400 });
    }

    // Buscar si ya existe la clienta con ese teléfono (normalizado) para este negocio
    const { data: existingClient } = await adminSupabase
      .from('Client')
      .select('id')
      .eq('businessId', businessId)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    let client;
    if (existingClient) {
      const { data: updatedClient, error: updateError } = await adminSupabase
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
         return NextResponse.json({ error: `Error al actualizar cliente: ${updateError.message}` }, { status: 500 });
      }
      client = updatedClient;
    } else {
      const { data: newClient, error: insertError } = await adminSupabase
        .from('Client')
        .insert({
          id: crypto.randomUUID(),
          businessId: businessId,
          userId: session.userId, // quien lo creó
          name,
          phone: normalizedPhone,
          email: email || null,
          notes,
          preferences,
          birthday: birthday || null,
          tags: tags || [],
          isActive,
          updatedAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
         console.error("[client insert error]", insertError);
         return NextResponse.json({ error: `Error al registrar cliente: ${insertError.message}` }, { status: 500 });
      }
      client = newClient;
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error("[clients POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
