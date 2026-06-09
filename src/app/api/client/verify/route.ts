import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase-admin";
import { signClientToken } from "@/lib/clientAuth";
import { rateLimit } from "@/lib/rateLimit";

const schema = z.object({
  phone: z.string().min(7).max(25),
  name: z.string().min(2).max(100),
});

// Strips all non-digits → for exact DB lookup
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

// Normalizes names for flexible substring comparison
function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

// Generic message — never distinguish "phone not found" from "name mismatch"
// to prevent cross-business phone enumeration.
const NOT_FOUND = "Datos no encontrados. Si tienes una reserva activa, verifica tu número.";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "0.0.0.0";
  if (!rateLimit(ip, { limit: 10, windowMs: 60 * 1000 })) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un minuto e intenta de nuevo." },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const { phone, name } = parsed.data;
    const digits = digitsOnly(phone);
    if (digits.length < 7) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // --- Phone lookup strategy (handles mixed storage formats in DB) -----------
    // Priority 1: exact match on digits-only (staff-created clients)
    // Priority 2: exact match on E.164 ("+{digits}", public-booking clients)
    // Priority 3: ends-with suffix match, LIMIT 1 (legacy / edge cases)
    //
    // Using .maybeSingle() on exact queries and .limit(1) on LIKE fallback so
    // we never return more than 1 row — eliminates array enumeration entirely.

    let client: { id: string; name: string; phone: string } | null = null;

    const { data: exactMatch, error: e1 } = await supabase
      .from("Client")
      .select("id, name, phone")
      .eq("phone", digits)
      .maybeSingle();
    if (e1) {
      console.error("[client verify] DB error on exact lookup");
      return NextResponse.json({ error: "Error en base de datos" }, { status: 500 });
    }
    client = exactMatch;

    if (!client) {
      const { data: e164Match, error: e2 } = await supabase
        .from("Client")
        .select("id, name, phone")
        .eq("phone", `+${digits}`)
        .maybeSingle();
      if (e2) {
        console.error("[client verify] DB error on e164 lookup");
        return NextResponse.json({ error: "Error en base de datos" }, { status: 500 });
      }
      client = e164Match;
    }

    if (!client && digits.length >= 7) {
      // Last-resort suffix scan: ends-with only, LIMIT 1 (never an array)
      const suffix = digits.slice(-7);
      const { data: suffixResults, error: e3 } = await supabase
        .from("Client")
        .select("id, name, phone")
        .like("phone", `%${suffix}`)
        .limit(1);
      if (e3) {
        console.error("[client verify] DB error on suffix lookup");
        return NextResponse.json({ error: "Error en base de datos" }, { status: 500 });
      }
      client = suffixResults?.[0] ?? null;
    }

    // --- Same response for "not found" and "wrong name" -----------------------
    // Never distinguish the two cases: prevents phone-existence enumeration.
    if (!client) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    const nStoredName = normalizeName(client.name);
    const nInputName = normalizeName(name);
    const nameMatch =
      nStoredName.includes(nInputName) ||
      nInputName.includes(nStoredName) ||
      nStoredName.split(" ")[0] === nInputName.split(" ")[0];

    if (!nameMatch) {
      return NextResponse.json({ error: NOT_FOUND }, { status: 404 });
    }

    const { count: appointmentsCount } = await supabase
      .from("Appointment")
      .select("*", { count: "exact", head: true })
      .eq("clientId", client.id);

    const token = await signClientToken({ clientPhone: phone, clientName: client.name });

    return NextResponse.json({
      token,
      clientName: client.name,
      appointmentsCount: appointmentsCount ?? 0,
    });
  } catch {
    console.error("[client verify POST] internal error");
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
