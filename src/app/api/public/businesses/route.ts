import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

// Maps category keys to their Spanish labels for text search matching
const CATEGORY_LABELS: Record<string, string> = {
  nails: "uñas",
  hair: "cabello",
  brows: "cejas pestañas",
  makeup: "maquillaje",
  other: "belleza",
};

function normalize(str: string): string {
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const city = searchParams.get("city")?.trim();
  const category = searchParams.get("category")?.trim();

  try {
    const supabase = createAdminClient();

    let query = supabase
      .from('Business')
      .select(`
        *,
        users:User(
          name,
          slug,
          avatarUrl,
          bio,
          serviceType,
          role,
          onboardingDone,
          services:Service(isActive)
        )
      `)
      .order('createdAt', { ascending: false })
      .limit(50);

    // City filter at DB level (case-insensitive)
    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    // Category filter at DB level only when Business.category is likely set
    // (for legacy records where Business.category is null, we fall back to client-side below)
    if (category) {
      query = query.eq('category', category);
    }

    const { data: businesses, error } = await query;

    if (error) {
      console.error("[public businesses GET query error]", error);
      return NextResponse.json({ businesses: [] });
    }

    let filteredBusinesses = businesses || [];

    // If category filter returned no results (likely because Business.category is null),
    // re-fetch without category filter and apply client-side using User.serviceType
    if (category && filteredBusinesses.length === 0) {
      const { data: allForCategory } = await supabase
        .from('Business')
        .select(`
          *,
          users:User(name, slug, avatarUrl, bio, serviceType, role, onboardingDone, services:Service(isActive))
        `)
        .order('createdAt', { ascending: false })
        .limit(50);

      filteredBusinesses = (allForCategory || []).filter((b: any) => {
        const owner = Array.isArray(b.users) ? b.users[0] : b.users;
        return b.category === category || owner?.serviceType === category;
      });

      // Re-apply city filter if needed
      if (city) {
        const normalizedCity = normalize(city);
        filteredBusinesses = filteredBusinesses.filter((b: any) =>
          normalize(b.city || "").includes(normalizedCity)
        );
      }
    }

    // Text search: name, owner name, bio, city, serviceType label — accent-insensitive
    if (q) {
      const searchQ = normalize(q);
      filteredBusinesses = filteredBusinesses.filter((b: any) => {
        const owner = Array.isArray(b.users) ? b.users[0] : b.users;
        const serviceKey = owner?.serviceType?.toLowerCase() || "";
        const serviceLabels = CATEGORY_LABELS[serviceKey] || "";
        return (
          normalize(b.name || "").includes(searchQ) ||
          normalize(owner?.name || "").includes(searchQ) ||
          normalize(b.city || "").includes(searchQ) ||
          normalize(owner?.bio || "").includes(searchQ) ||
          serviceKey.includes(searchQ) ||
          normalize(serviceLabels).includes(searchQ)
        );
      });
    }

    const result = filteredBusinesses.map((b: any) => {
      const owner = Array.isArray(b.users) ? b.users[0] : b.users;
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
          name: owner?.name || "Desconocido",
          slug: owner?.slug,
          avatarUrl: owner?.avatarUrl,
          bio: owner?.bio,
          serviceType: owner?.serviceType,
          servicesCount: owner?.services?.filter((s: any) => s.isActive).length || 0,
        },
      };
    });

    return NextResponse.json({ businesses: result });
  } catch (error) {
    console.error("[public businesses GET]", error);
    return NextResponse.json({ businesses: [] });
  }
}
