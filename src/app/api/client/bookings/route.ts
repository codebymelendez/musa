export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { getClientSession } from "@/lib/clientAuth";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const supabase = createAdminClient();
  const authHeader = req.headers.get("authorization");

  let clientId: string | null = null;
  let displayName = "";

  if (authHeader) {
    // Phone-based JWT auth (musa_client_token)
    const clientSession = await getClientSession(authHeader);
    if (!clientSession) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    displayName = clientSession.clientName;
    const { data: client } = await supabase
      .from("Client")
      .select("id")
      .eq("phone", clientSession.clientPhone)
      .limit(1)
      .maybeSingle();
    clientId = client?.id ?? null;
  } else {
    // Supabase session auth (Google sign-in as client)
    const supabaseSession = await getSession(req);
    if (!supabaseSession?.email) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const { data: client } = await supabase
      .from("Client")
      .select("id, name")
      .eq("email", supabaseSession.email)
      .limit(1)
      .maybeSingle();
    if (client) {
      clientId = client.id;
      displayName = client.name;
    } else {
      const { data: user } = await supabase
        .from("User")
        .select("name")
        .eq("id", supabaseSession.userId)
        .maybeSingle();
      displayName = user?.name ?? "";
    }
  }

  if (!clientId) {
    return NextResponse.json({ clientName: displayName, upcoming: [], past: [], total: 0 });
  }

  try {
    const { data: clientAppointments } = await supabase
      .from("Appointment")
      .select(`
        id,
        startTime,
        endTime,
        status,
        rescheduleToken,
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
      .eq("clientId", clientId)
      .order("startTime", { ascending: false });

    const results = clientAppointments || [];
    const now = new Date();
    const upcoming = results.filter(
      (a) => new Date(a.startTime) >= now && a.status !== "cancelled"
    );
    const past = results.filter(
      (a) => new Date(a.startTime) < now || a.status === "cancelled"
    );

    return NextResponse.json({ clientName: displayName, upcoming, past, total: results.length });
  } catch (error) {
    console.error("[client bookings GET]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
