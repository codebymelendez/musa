import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { createClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";
import { checkAppointmentLimit } from "@/lib/limits";
import { getBlocksInRange, isSlotBlocked } from "@/lib/availability";
import { dayRangeUTC, DEFAULT_TZ } from "@/lib/utils";

const createSchema = z.object({
  clientId: z.string().nullable().optional(),
  serviceId: z.string(),
  startTime: z.string().datetime(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let startFilter: string;
  let endFilter: string;

  if (date) {
    const { data: user } = await createAdminClient()
      .from('User')
      .select('business:Business(timezone)')
      .eq('id', session.userId)
      .maybeSingle();
    const tz = (user?.business as any)?.timezone ?? DEFAULT_TZ;
    ({ start: startFilter, end: endFilter } = dayRangeUTC(date, tz));
  } else if (from && to) {
    startFilter = new Date(from).toISOString();
    endFilter = new Date(to).toISOString();
  } else {
    // Default: hoy
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    startFilter = d.toISOString();
    d.setHours(23, 59, 59, 999);
    endFilter = d.toISOString();
  }

  try {
    const supabase = createAdminClient();
    const { data: appointments, error } = await supabase
      .from('Appointment')
      .select('*, client:Client(*), service:Service(*), payment:Payment(*)')
      .eq('userId', session.userId)
      .gte('startTime', startFilter)
      .lte('startTime', endFilter)
      .order('startTime', { ascending: true });

    if (error) {
      console.error("[appointments fetch error]", error);
      return NextResponse.json({ error: "Error al obtener citas" }, { status: 500 });
    }

    // Format one-to-one relations which Supabase might return as an array
    const formattedAppointments = (appointments || []).map((apt: any) => ({
      ...apt,
      client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
      service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
      payment: Array.isArray(apt.payment) ? apt.payment[0] : apt.payment,
    }));

    return NextResponse.json(formattedAppointments);
  } catch (error) {
    console.error("[appointments GET]", error);
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

    const { clientId, serviceId, startTime, notes } = parsed.data;
    // Usar el cliente ADMIN para evitar fallos de RLS debido a la falta de cookies en peticiones móviles
    const supabase = createAdminClient();

    const { data: user } = await supabase
      .from('User')
      .select('businessId')
      .eq('id', session.userId)
      .single();

    if (!user?.businessId) {
      return NextResponse.json({ error: "El usuario no pertenece a un negocio" }, { status: 400 });
    }

    // Obtener duración del servicio
    const { data: service } = await supabase
      .from('Service')
      .select('durationMin')
      .eq('id', serviceId)
      .eq('userId', session.userId)
      .single();

    if (!service) {
      return NextResponse.json({ error: "Servicio no encontrado" }, { status: 404 });
    }

    const start = new Date(startTime);
    const end = new Date(start.getTime() + service.durationMin * 60000);

    // Detectar conflicto de horario
    const { data: conflict } = await supabase
      .from('Appointment')
      .select('id')
      .eq('userId', session.userId)
      .not('status', 'in', '(cancelled,no_show)')
      .filter('startTime', 'lt', end.toISOString())
      .filter('endTime', 'gt', start.toISOString())
      .limit(1);

    if (conflict && conflict.length > 0) {
      return NextResponse.json(
        { error: "Ya tienes una cita en ese horario" },
        { status: 409 }
      );
    }

    // Verificar bloqueos de agenda
    const blocks = await getBlocksInRange(session.userId, start, end);
    if (isSlotBlocked(start, end, blocks)) {
      return NextResponse.json(
        { error: "Ese horario está bloqueado en tu agenda" },
        { status: 409 }
      );
    }

    // Verificar límite inmediatamente antes del INSERT para minimizar ventana de race condition
    const canCreate = await checkAppointmentLimit(user.businessId);
    if (!canCreate) {
      return NextResponse.json(
        { error: "Has alcanzado el límite de citas de tu plan gratuito. Actualiza a PRO para citas ilimitadas." },
        { status: 403 }
      );
    }

    // Si clientId es nulo o indefinido (walk-in client de la app móvil),
    // buscar o crear el cliente comodín "Cliente sin registrar" para el negocio.
    let finalClientId = clientId;
    if (!finalClientId) {
      const { data: walkInClient } = await supabase
        .from('Client')
        .select('id')
        .eq('businessId', user.businessId)
        .eq('phone', '0000000000')
        .maybeSingle();

      if (walkInClient) {
        finalClientId = walkInClient.id;
      } else {
        const { data: newWalkIn, error: walkInError } = await supabase
          .from('Client')
          .insert({
            id: crypto.randomUUID(),
            businessId: user.businessId,
            userId: session.userId,
            name: 'Cliente sin registrar',
            phone: '0000000000',
            isActive: true,
          })
          .select('id')
          .single();

        if (walkInError || !newWalkIn) {
          console.error("[walkin client create error]", walkInError);
          return NextResponse.json({ error: "Error al crear cliente comodín para walk-in" }, { status: 500 });
        }
        finalClientId = newWalkIn.id;
      }
    }

    const { data: appointment, error: createError } = await supabase
      .from('Appointment')
      .insert({
        id: crypto.randomUUID(),
        userId: session.userId,
        clientId: finalClientId,
        serviceId,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        status: "confirmed",
        notes,
        rescheduleToken: crypto.randomUUID(),
      })
      .select('*, client:Client(*), service:Service(*)')
      .single();

    if (createError) {
      console.error("[appointment create error]", createError);
      return NextResponse.json({ error: "Error al crear la cita" }, { status: 500 });
    }

    const formatted = appointment ? {
      ...appointment,
      client: Array.isArray(appointment.client) ? appointment.client[0] : appointment.client,
      service: Array.isArray(appointment.service) ? appointment.service[0] : appointment.service,
    } : null;

    return NextResponse.json(formatted, { status: 201 });
  } catch (error) {
    console.error("[appointments POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
