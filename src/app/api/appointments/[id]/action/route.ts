import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { sendClientNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const session = await getSession(req);
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id } = await params;
  const action = req.nextUrl.searchParams.get("action");

  if (action !== "confirm" && action !== "cancel") {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();
    const { data: appointment } = await supabase
      .from("Appointment")
      .select("*, service:Service(*), user:User(*), client:Client(*)")
      .eq("id", id)
      .eq("userId", session.userId)
      .single();

    if (!appointment) {
      return NextResponse.json({ error: "Cita no encontrada" }, { status: 404 });
    }

    const newStatus = action === "confirm" ? "confirmed" : "cancelled";

    const { error: updateError } = await supabase
      .from("Appointment")
      .update({ status: newStatus })
      .eq("id", id);

    if (updateError) throw updateError;

    if (action === "cancel") {
      const startStr = new Date(appointment.startTime).toLocaleTimeString("es-VE", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Caracas",
      });
      await sendClientNotification(appointment.clientId, {
        title: "Cita cancelada",
        body: `Tu cita de ${appointment.service.name} a las ${startStr} fue cancelada.`,
        // DEPRECATED: User.slug legacy — el canónico es Business.slug (redirige vía SlugHistory)
        url: `/p/${appointment.user.slug}`,
      });
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("[appointment action POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
