/**
 * GET /api/public/services
 * Devuelve todos los nombres de servicios únicos activos,
 * agrupados por categoría. Usado por el buscador del home.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export const revalidate = 300; // 5 min

const CATEGORY_META: Record<string, { label: string; order: number }> = {
  hair:   { label: "Cabello",     order: 1 },
  nails:  { label: "Uñas",       order: 2 },
  brows:  { label: "Cejas",      order: 3 },
  lashes: { label: "Pestañas",   order: 4 },
  makeup: { label: "Maquillaje", order: 5 },
  other:  { label: "Otros",      order: 6 },
};

export async function GET() {
  try {
    const admin = createAdminClient();

    const { data, error } = await admin
      .from("Service")
      .select("name, category, user:User!inner(serviceType, role)")
      .eq("isActive", true)
      .order("name", { ascending: true });

    if (error || !data) {
      return NextResponse.json({ categories: [] });
    }

    // Agrupar nombres únicos por categoría
    const grouped: Record<string, Set<string>> = {};

    for (const svc of data) {
      const userArr = Array.isArray(svc.user) ? svc.user : [svc.user];
      const serviceType = (userArr[0] as { serviceType?: string } | null)?.serviceType;
      const cat = (svc.category as string | null) || serviceType || "other";
      if (!grouped[cat]) grouped[cat] = new Set();
      grouped[cat].add(svc.name);
    }

    const categories = Object.entries(grouped)
      .map(([key, names]) => ({
        key,
        label: CATEGORY_META[key]?.label ?? "Otros",
        order: CATEGORY_META[key]?.order ?? 99,
        services: Array.from(names).sort(),
      }))
      .sort((a, b) => a.order - b.order);

    return NextResponse.json({ categories });
  } catch (e) {
    console.error("[public/services GET]", e);
    return NextResponse.json({ categories: [] });
  }
}
