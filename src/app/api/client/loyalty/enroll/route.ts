/**
 * POST /api/client/loyalty/enroll
 * Permite a una clienta auto-inscribirse en el programa de fidelización de un negocio
 * donde ya ha tenido citas. Crea la ClientLoyaltyAccount con 0 puntos y genera su QR.
 */
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { getClientSession } from "@/lib/clientAuth";

const bodySchema = z.object({
  businessId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getClientSession(req.headers.get("authorization"));
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { businessId } = parsed.data;
    const supabase = createAdminClient();

    // Verificar que el programa esté activo
    const { data: program } = await supabase
      .from("LoyaltyProgram")
      .select("id")
      .eq("businessId", businessId)
      .eq("isActive", true)
      .maybeSingle();

    if (!program) {
      return NextResponse.json({ error: "Este negocio no tiene programa de fidelización activo" }, { status: 404 });
    }

    // Buscar el Client de esta clienta en ese negocio (por teléfono)
    const { data: client } = await supabase
      .from("Client")
      .select("id")
      .eq("businessId", businessId)
      .eq("phone", session.clientPhone)
      .maybeSingle();

    if (!client) {
      return NextResponse.json({ error: "No se encontró tu perfil en este negocio" }, { status: 404 });
    }

    // Verificar si ya tiene cuenta
    const { data: existing } = await supabase
      .from("ClientLoyaltyAccount")
      .select("id, qrToken, totalPoints, lifetimePoints")
      .eq("clientId", client.id)
      .eq("businessId", businessId)
      .maybeSingle();

    if (existing) {
      // Ya existe — devolver la cuenta existente
      return NextResponse.json({ account: existing });
    }

    // Crear cuenta nueva con 0 puntos
    const { data: newAccount, error } = await supabase
      .from("ClientLoyaltyAccount")
      .insert({
        id: randomUUID(),
        businessId,
        clientId: client.id,
        programId: program.id,   // requerido por NOT NULL constraint
        totalPoints: 0,
        lifetimePoints: 0,
        updatedAt: new Date().toISOString(),
        // qrToken se genera automáticamente en la BD (encode(gen_random_bytes(16), 'hex'))
      })
      .select("id, qrToken, totalPoints, lifetimePoints")
      .single();

    if (error || !newAccount) {
      console.error("[client/loyalty/enroll POST]", error);
      return NextResponse.json({ error: "Error al crear cuenta" }, { status: 500 });
    }

    return NextResponse.json({ account: newAccount }, { status: 201 });
  } catch (error) {
    console.error("[client/loyalty/enroll POST]", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
