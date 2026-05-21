import { NextResponse } from "next/server";

const API_URL = "https://ve.dolarapi.com/v1/cotizaciones";

// Caché en memoria — respaldo para entornos serverless con cold starts
let memCache: { rate: number; fecha: string; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

interface Cotizacion {
  moneda: string;
  fuente: string;
  promedio: number | null;
  venta: number | null;
  compra: number | null;
  fechaActualizacion: string;
}

export async function GET() {
  // Caché en memoria aún fresca
  if (memCache && Date.now() - memCache.fetchedAt < CACHE_TTL_MS) {
    return NextResponse.json({ usd: memCache.rate, fecha: memCache.fecha });
  }

  try {
    const res = await fetch(API_URL, {
      headers: { "Accept": "application/json" },
      // Next.js Data Cache: reutiliza entre requests durante 1 hora
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8_000),
    });

    if (!res.ok) throw new Error(`dolarapi respondió ${res.status}`);

    const data: Cotizacion[] = await res.json();

    // Buscar la entrada USD oficial (BCV)
    const usdEntry = data.find(
      (c) => c.moneda === "USD" && c.fuente === "oficial"
    );
    if (!usdEntry) throw new Error("Entrada USD oficial no encontrada en la respuesta");

    const rate = usdEntry.promedio ?? usdEntry.venta ?? usdEntry.compra;
    if (!rate || rate <= 0) throw new Error("Tasa USD inválida o nula");

    // Extrae solo la fecha: "2026-05-21T00:00:00-04:00" → "2026-05-21"
    const fecha = usdEntry.fechaActualizacion.slice(0, 10);

    memCache = { rate, fecha, fetchedAt: Date.now() };
    return NextResponse.json({ usd: rate, fecha });

  } catch (err) {
    console.error("[bcv-rate]", err instanceof Error ? err.message : err);

    // Devuelve caché aunque esté vencida antes que un error
    if (memCache) {
      return NextResponse.json({ usd: memCache.rate, fecha: memCache.fecha, stale: true });
    }

    return NextResponse.json(
      { error: "No se pudo obtener la tasa BCV" },
      { status: 503 }
    );
  }
}
