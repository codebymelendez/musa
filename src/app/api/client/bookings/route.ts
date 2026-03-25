import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getClientSession } from "@/lib/clientAuth";

export async function GET(req: NextRequest) {
  const session = await getClientSession(req.headers.get("authorization"));
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { data: appointments } = await supabase
      .from('Appointment')
      .select(`
        *,
        service:Service(name, durationMin, price, currency),
        user:User(
          name,
          slug,
          avatarUrl,
          serviceType,
          whatsapp,
          business:Business(name, city)
        ),
        client:Client(name, phone)
      `)
      .eq('client.phone', session.clientPhone)
      .order('startTime', { ascending: false });

    if (!appointments) {
       return NextResponse.json({ clientName: session.clientName, upcoming: [], past: [], total: 0 });
    }

    // Supabase filtering for nested objects is tricky in a single query if the join is many-to-one.
    // However, the eq('client.phone', ...) only works if we join correctly.
    // In Supabase JS, we might need to filter after or use a more complex query.
    // Let's use a simpler join and filter by clientId if we had it, but we only have phone.
    // So we'll fetch based on client phone.
    
    // Alternative: fetch client id first.
    const { data: client } = await supabase
      .from('Client')
      .select('id')
      .eq('phone', session.clientPhone)
      .limit(1)
      .maybeSingle();
    
    if (!client) {
       return NextResponse.json({ clientName: session.clientName, upcoming: [], past: [], total: 0 });
    }

    const { data: clientAppointments } = await supabase
      .from('Appointment')
      .select(`
        *,
        service:Service(name, durationMin, price, currency),
        user:User(
          name,
          slug,
          avatarUrl,
          serviceType,
          whatsapp,
          business:Business(name, city)
        ),
        client:Client(name, phone)
      `)
      .eq('clientId', client.id)
      .order('startTime', { ascending: false });

    const results = clientAppointments || [];

    // Separar próximas y pasadas
    const now = new Date();
    const upcoming = results.filter(
      (a) => new Date(a.startTime) >= now && a.status !== "cancelled"
    );
    const past = results.filter(
      (a) => new Date(a.startTime) < now || a.status === "cancelled"
    );

    return NextResponse.json({
      clientName: session.clientName,
      upcoming,
      past,
      total: results.length,
    });
  } catch (error) {
    console.error("[client bookings GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
