// Proxy server-side para Google Maps Platform (Places, Time Zone).
// La key vive solo en el servidor (GOOGLE_MAPS_SERVER_KEY) y nunca se expone
// al cliente ni aparece en logs ni respuestas.

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rateLimit } from "@/lib/rateLimit";

const GOOGLE_BASE = "https://maps.googleapis.com/maps/api";

export async function proxyGoogleRequest(
  req: NextRequest,
  upstreamPath: string,
  allowedParams: readonly string[],
): Promise<NextResponse> {
  const session = await getSession(req);
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Rate limit por usuario reutilizando el tracker en memoria del proyecto
  if (!rateLimit(`google:${upstreamPath}:${session.userId}`, { limit: 120, windowMs: 60_000 })) {
    return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 });
  }

  const key = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!key) {
    return NextResponse.json({ error: "maps_not_configured" }, { status: 503 });
  }

  // Whitelist estricta: cualquier otro query param (incluido un "key" enviado
  // por el cliente) se descarta.
  const params = new URLSearchParams();
  for (const name of allowedParams) {
    const value = req.nextUrl.searchParams.get(name);
    if (value !== null && value !== "") params.set(name, value);
  }
  params.set("key", key);

  try {
    const upstream = await fetch(`${GOOGLE_BASE}${upstreamPath}?${params.toString()}`);
    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error(
      `[google-proxy ${upstreamPath}]`,
      error instanceof Error ? error.message : "fetch failed",
    );
    return NextResponse.json({ error: "upstream_error" }, { status: 502 });
  }
}
