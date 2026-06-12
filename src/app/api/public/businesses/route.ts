import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rateLimit";

// Maps category keys to Spanish labels for text search
const CATEGORY_LABELS: Record<string, string> = {
  nails:  "uñas",
  hair:   "cabello",
  brows:  "cejas pestañas",
  lashes: "pestañas",
  makeup: "maquillaje",
  other:  "belleza",
};

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Hard ceiling on results returned — regardless of how many match filters.
const MAX_RESULTS = 30;

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "0.0.0.0";
  // 60 req/min per IP — generous for real browsing, blocks automated scraping.
  if (!rateLimit(ip, { limit: 60, windowMs: 60 * 1000 })) {
    return NextResponse.json({ businesses: [] }, { status: 429 });
  }

  const { searchParams } = request.nextUrl;
  const q        = searchParams.get("q")?.trim();
  const city     = searchParams.get("city")?.trim();
  const category = searchParams.get("category")?.trim();
  const service  = searchParams.get("service")?.trim();
  const date     = searchParams.get("date")?.trim();

  try {
    const supabase = createAdminClient();

    // Minimal SELECT: only fetch columns actually used in the public response.
    // Removed: appRole, onboardingDone, price (internal/sensitive).
    // Removed: userId from BusinessHours (internal foreign key, never in response).
    let query = supabase
      .from("Business")
      .select(`
        id,
        name,
        slug,
        category,
        city,
        address,
        logoUrl,
        hours:BusinessHours(dayOfWeek, isOpen),
        users:User(
          name,
          slug,
          avatarUrl,
          bio,
          serviceType,
          services:Service(isActive, name, category),
          settings:ProfessionalSettings(bookingEnabled)
        )
      `)
      .order("createdAt", { ascending: false })
      .limit(MAX_RESULTS);

    if (city)     query = query.ilike("city", `%${city}%`);
    if (category) query = query.eq("category", category);

    const { data: businesses, error } = await query;

    if (error) {
      console.error("[public businesses GET] DB error");
      return NextResponse.json({ businesses: [] });
    }

    let filtered = businesses || [];

    // Legacy re-fetch when category filter returned nothing (old records with null category)
    if (category && filtered.length === 0) {
      const { data: all } = await supabase
        .from("Business")
        .select(`
          id,
          name,
          slug,
          category,
          city,
          address,
          hours:BusinessHours(dayOfWeek, isOpen),
          users:User(
            name,
            slug,
            avatarUrl,
            bio,
            serviceType,
            services:Service(isActive, name, category),
            settings:ProfessionalSettings(bookingEnabled)
          )
        `)
        .order("createdAt", { ascending: false })
        .limit(MAX_RESULTS);

      filtered = (all || []).filter((b: any) => {
        const owner = Array.isArray(b.users) ? b.users[0] : b.users;
        return b.category === category || owner?.serviceType === category;
      });

      if (city) {
        const nCity = normalize(city);
        filtered = filtered.filter((b: any) => normalize(b.city || "").includes(nCity));
      }
    }

    // Service name filter (JS-side, post-query)
    if (service) {
      const nService = normalize(service);
      filtered = filtered.filter((b: any) => {
        const owner = Array.isArray(b.users) ? b.users[0] : b.users;
        const svcs = Array.isArray(owner?.services) ? owner.services : [];
        return svcs.some((s: any) => s.isActive && normalize(s.name || "").includes(nService));
      });
    }

    // Day-of-week filter
    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const dayOfWeek = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
      filtered = filtered.filter((b: any) => {
        const hours = b.hours || [];
        if (hours.length === 0) return true;
        const dayConfig = hours.find((h: any) => h.dayOfWeek === dayOfWeek);
        return dayConfig ? dayConfig.isOpen : false;
      });
    }

    // Text search
    if (q) {
      const sq = normalize(q);
      filtered = filtered.filter((b: any) => {
        const owner = Array.isArray(b.users) ? b.users[0] : b.users;
        const serviceKey = owner?.serviceType?.toLowerCase() || "";
        const serviceLabels = CATEGORY_LABELS[serviceKey] || "";
        const svcs = Array.isArray(owner?.services) ? owner.services : [];
        const svcNames = svcs.map((s: any) => normalize(s.name || "")).join(" ");
        return (
          normalize(b.name || "").includes(sq) ||
          normalize(owner?.name || "").includes(sq) ||
          normalize(b.city || "").includes(sq) ||
          normalize(owner?.bio || "").includes(sq) ||
          serviceKey.includes(sq) ||
          normalize(serviceLabels).includes(sq) ||
          svcNames.includes(sq)
        );
      });
    }

    // Hard ceiling applied after JS filtering too
    const capped = filtered.slice(0, MAX_RESULTS);

    const result = capped.map((b: any) => {
      const owner = Array.isArray(b.users) ? b.users[0] : b.users;
      const staffCount = Array.isArray(b.users) ? b.users.length : 1;
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        category: b.category || owner?.serviceType || null,
        city: b.city,
        address: b.address,
        logoUrl: b.logoUrl ?? null,
        staffCount,
        owner: {
          name:          owner?.name ?? "Desconocido",
          // DEPRECATED: User.slug legacy — el canónico es el slug del Business (campo `slug` de arriba)
          slug:          owner?.slug,
          avatarUrl:     owner?.avatarUrl,
          // Truncate bio — prevents large payload and reduces scraping value
          bio:           owner?.bio ? (owner.bio as string).slice(0, 200) : null,
          serviceType:   owner?.serviceType,
          servicesCount: (Array.isArray(owner?.services) ? owner.services : [])
            .filter((s: any) => s.isActive).length,
        },
      };
    });

    return NextResponse.json({ businesses: result });
  } catch {
    console.error("[public businesses GET] internal error");
    return NextResponse.json({ businesses: [] });
  }
}
