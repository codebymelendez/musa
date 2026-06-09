import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Maps category keys to their Spanish labels for text search matching
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

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q        = searchParams.get("q")?.trim();
  const city     = searchParams.get("city")?.trim();
  const category = searchParams.get("category")?.trim();
  const service  = searchParams.get("service")?.trim();   // nombre de servicio específico
  const date     = searchParams.get("date")?.trim();      // YYYY-MM-DD → filtrar por día de semana

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("Business")
      .select(`
        *,
        hours:BusinessHours(dayOfWeek, isOpen, userId),
        users:User(
          name,
          slug,
          avatarUrl,
          bio,
          serviceType,
          appRole,
          onboardingDone,
          services:Service(isActive, name, category, price),
          settings:ProfessionalSettings(bookingEnabled)
        )
      `)
      .order("createdAt", { ascending: false })
      .limit(50);

    // Filtro de ciudad a nivel DB (case-insensitive)
    if (city) {
      query = query.ilike("city", `%${city}%`);
    }

    // Filtro de categoría a nivel DB
    if (category) {
      query = query.eq("category", category);
    }

    const { data: businesses, error } = await query;

    if (error) {
      console.error("[public businesses GET]", error);
      return NextResponse.json({ businesses: [] });
    }

    let filteredBusinesses = businesses || [];

    // Re-fetch sin categoría si no hubo resultados (registros legacy con Business.category null)
    if (category && filteredBusinesses.length === 0) {
      const { data: allForCategory } = await supabase
        .from("Business")
        .select(`
          *,
          hours:BusinessHours(dayOfWeek, isOpen, userId),
          users:User(
            name, slug, avatarUrl, bio, serviceType, appRole, onboardingDone,
            services:Service(isActive, name, category, price),
            settings:ProfessionalSettings(bookingEnabled)
          )
        `)
        .order("createdAt", { ascending: false })
        .limit(50);

      filteredBusinesses = (allForCategory || []).filter((b: any) => {
        const owner = Array.isArray(b.users) ? b.users[0] : b.users;
        return b.category === category || owner?.serviceType === category;
      });

      if (city) {
        const nCity = normalize(city);
        filteredBusinesses = filteredBusinesses.filter((b: any) =>
          normalize(b.city || "").includes(nCity)
        );
      }
    }

    // ── Filtro por servicio específico ───────────────────────────────────
    if (service) {
      const nService = normalize(service);
      filteredBusinesses = filteredBusinesses.filter((b: any) => {
        const owner = Array.isArray(b.users) ? b.users[0] : b.users;
        const svcs  = Array.isArray(owner?.services) ? owner.services : [];
        return svcs.some(
          (s: any) => s.isActive && normalize(s.name || "").includes(nService)
        );
      });
    }

    // ── Filtro por fecha (día de semana vs BusinessHours) ──────────────────────
    if (date) {
      // date = "YYYY-MM-DD" → obtenemos el día de la semana de forma segura e independiente de zona horaria
      const [y, m, dayNum] = date.split('-').map(Number);
      const dayOfWeek = new Date(Date.UTC(y, m - 1, dayNum)).getUTCDay();

      filteredBusinesses = filteredBusinesses.filter((b: any) => {
        const hours = b.hours || [];
        if (hours.length === 0) return true; // sin configuración = incluir siempre
        
        // Buscar el horario del negocio para ese día (userId === null)
        const dayConfig = hours.find((h: any) => h.dayOfWeek === dayOfWeek && h.userId === null);
        return dayConfig ? dayConfig.isOpen : false;
      });
    }

    // ── Búsqueda de texto libre ───────────────────────────────────────────
    if (q) {
      const searchQ = normalize(q);
      filteredBusinesses = filteredBusinesses.filter((b: any) => {
        const owner       = Array.isArray(b.users) ? b.users[0] : b.users;
        const serviceKey  = owner?.serviceType?.toLowerCase() || "";
        const serviceLabels = CATEGORY_LABELS[serviceKey] || "";
        const svcs        = Array.isArray(owner?.services) ? owner.services : [];
        const svcNames    = svcs.map((s: any) => normalize(s.name || "")).join(" ");
        return (
          normalize(b.name || "").includes(searchQ) ||
          normalize(owner?.name || "").includes(searchQ) ||
          normalize(b.city || "").includes(searchQ) ||
          normalize(owner?.bio || "").includes(searchQ) ||
          serviceKey.includes(searchQ) ||
          normalize(serviceLabels).includes(searchQ) ||
          svcNames.includes(searchQ)
        );
      });
    }

    const result = filteredBusinesses.map((b: any) => {
      const owner      = Array.isArray(b.users) ? b.users[0] : b.users;
      const staffCount = Array.isArray(b.users) ? b.users.length : 1;
      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        category: b.category || owner?.serviceType || null,
        city: b.city,
        address: b.address,
        staffCount,
        owner: {
          name:         owner?.name || "Desconocido",
          slug:         owner?.slug,
          avatarUrl:    owner?.avatarUrl,
          bio:          owner?.bio,
          serviceType:  owner?.serviceType,
          servicesCount: (Array.isArray(owner?.services) ? owner.services : [])
            .filter((s: any) => s.isActive).length,
        },
      };
    });

    return NextResponse.json({ businesses: result });
  } catch (error) {
    console.error("[public businesses GET]", error);
    return NextResponse.json({ businesses: [] });
  }
}
