import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { signClientToken } from "@/lib/clientAuth";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  phone: z.string().min(7),
  name: z.string().min(2),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting por IP (Máximo 10 intentos por minuto)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    if (!rateLimit(ip, { limit: 10, windowMs: 60 * 1000 })) {
      return NextResponse.json(
        { error: "Demasiados intentos de verificación. Inténtalo de nuevo en un minuto." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { phone, name } = parsed.data;
    const supabase = createAdminClient();

    // Normalizar teléfono (solo números)
    const normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.length < 7) {
      return NextResponse.json({ error: "Número de teléfono incompleto" }, { status: 400 });
    }

    // Obtener los últimos 7 dígitos para buscar de forma rápida y eficiente por sufijo
    const suffix = normalizedPhone.slice(-7);

    // Búsqueda súper optimizada a nivel de DB por sufijo telefónico
    const { data: matchedClients, error: searchError } = await supabase
      .from('Client')
      .select('id, name, phone')
      .like('phone', `%${suffix}%`);

    if (searchError) {
      console.error("[client verify] Error en consulta:", searchError);
      return NextResponse.json({ error: "Error en base de datos" }, { status: 500 });
    }

    console.log(`[client verify] Buscando: ${phone} (${normalizedPhone}). Coincidencias en DB: ${matchedClients?.length || 0}`);

    const client = matchedClients?.find(c => {
       const cPhone = c.phone.replace(/\D/g, "");
       const match = cPhone.includes(normalizedPhone) || 
                     normalizedPhone.includes(cPhone) || 
                     c.phone === phone;
       if (match) console.log(`[client verify] Coincidencia encontrada: ${c.name} (${c.phone})`);
       return match;
    });

    if (!client) {
      console.log(`[client verify] No se encontró cliente para: ${phone}`);
      return NextResponse.json(
        { error: "No encontramos citas con ese número. ¿Ya hiciste una reserva?" },
        { status: 404 }
      );
    }

    // Verificar que el nombre coincide (insensible a mayúsculas y tildes)
    const normalize = (s: string) =>
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-s]/g, "") // Solo letras para mayor flexibilidad
        .trim();

    const nClientName = normalize(client.name);
    const nInputName = normalize(name);

    const nameMatch =
      nClientName.includes(nInputName) ||
      nInputName.includes(nClientName) ||
      // Probar si el primer nombre coincide
      nClientName.split(" ")[0] === nInputName.split(" ")[0];

    if (!nameMatch) {
      return NextResponse.json(
        { error: "El nombre no coincide con nuestros registros" },
        { status: 401 }
      );
    }

    // Contar reservas para confirmar que es usuaria real
    const { count: appointmentsCount } = await supabase
      .from('Appointment')
      .select('*', { count: 'exact', head: true })
      .eq('clientId', client.id);

    const token = await signClientToken({ clientPhone: phone, clientName: client.name });

    return NextResponse.json({
      token,
      clientName: client.name,
      appointmentsCount: appointmentsCount || 0,
    });
  } catch (error) {
    console.error("[client verify POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
