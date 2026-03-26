import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const q = searchParams.get("q")?.trim();
  const city = searchParams.get("city")?.trim();
  const category = searchParams.get("category")?.trim();

  try {
    const supabase = createAdminClient();
    
    // Construcción de la consulta con Supabase
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
      .limit(24);

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }

    const { data: businesses, error } = await query;

    console.log(`[public businesses] Encontrados en DB: ${businesses?.length || 0}`);

    if (error) {
      console.error("[public businesses GET query error]", error);
      return NextResponse.json([]);
    }

    // Client-side filtering for nested OR because Supabase .or() with foreign tables can be tricky
    let filteredBusinesses = businesses || [];
    if (q) {
      const searchQ = q.toLowerCase();
      filteredBusinesses = filteredBusinesses.filter((b: any) => {
        const owner = Array.isArray(b.users) ? b.users[0] : b.users;
        return b.name?.toLowerCase().includes(searchQ) || owner?.name?.toLowerCase().includes(searchQ);
      });
    }

    if (!businesses) {
      return NextResponse.json({ businesses: [] });
    }

    // Para obtener el staffCount de forma eficiente, podríamos necesitar otra query
    // o haber incluido a todos los usuarios. Pero para el MVP, usaremos otra consulta
    // o una aproximación.
    
    const result = await Promise.all(filteredBusinesses.map(async (b) => {
      const owner = Array.isArray(b.users) ? b.users[0] : b.users;
      
      // Obtener conteo de staff (excluyendo al owner si se desea, o total)
      const { count: staffCount } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true })
        .eq('businessId', b.id);

      return {
        id: b.id,
        name: b.name,
        slug: b.slug,
        category: b.category,
        city: b.city,
        address: b.address,
        staffCount: staffCount || 1,
        owner: {
          name: owner?.name || "Desconocido",
          slug: owner?.slug,
          avatarUrl: owner?.avatarUrl,
          bio: owner?.bio,
          serviceType: owner?.serviceType,
          servicesCount: owner?.services?.filter((s: any) => s.isActive).length || 0,
        },
      };
    }));

    return NextResponse.json({ businesses: result });
  } catch (error) {
    console.error("[public businesses GET]", error);
    return NextResponse.json({ businesses: [] });
  }
}
