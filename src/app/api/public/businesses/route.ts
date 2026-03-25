import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q")?.trim();
  const city = searchParams.get("city")?.trim();
  const category = searchParams.get("category")?.trim();

  try {
    const supabase = await createClient();
    
    // Construcción de la consulta con Supabase
    let query = supabase
      .from('Business')
      .select(`
        *,
        users:User!inner(
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
      .eq('users.role', 'OWNER')
      .eq('users.onboardingDone', true)
      .order('createdAt', { ascending: false })
      .limit(24);

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (q) {
      // Búsqueda en nombre de negocio o nombre de dueño
      query = query.or(`name.ilike.%${q}%,users.name.ilike.%${q}%`);
    }

    const { data: businesses } = await query;

    if (!businesses) {
      return NextResponse.json({ businesses: [] });
    }

    // Para obtener el staffCount de forma eficiente, podríamos necesitar otra query
    // o haber incluido a todos los usuarios. Pero para el MVP, usaremos otra consulta
    // o una aproximación.
    
    const result = await Promise.all(businesses.map(async (b) => {
      const owner = b.users[0];
      
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
          name: owner.name,
          slug: owner.slug,
          avatarUrl: owner.avatarUrl,
          bio: owner.bio,
          serviceType: owner.serviceType,
          servicesCount: owner.services?.filter((s: any) => s.isActive).length || 0,
        },
      };
    }));

    return NextResponse.json({ businesses: result });
  } catch (error) {
    console.error("[public businesses GET]", error);
    return NextResponse.json({ businesses: [] });
  }
}
