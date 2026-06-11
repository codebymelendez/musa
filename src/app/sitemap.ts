import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase-admin";

const BASE_URL = "https://getmusa.app";

const KNOWN_CITIES = ["maracaibo", "valencia", "caracas", "barquisimeto", "maracay"];

const TYPE_TO_SERVICIOS: Record<string, string[]> = {
  nails:  ["manicura", "pedicure", "unas-acrilicas"],
  brows:  ["cejas"],
  makeup: ["maquillaje"],
  hair:   ["cabello"],
  lashes: ["pestanas"],
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient();

  // El slug público canónico es Business.slug (User.slug queda deprecado)
  const { data: users } = await admin
    .from("User")
    .select("slug, serviceType, business:Business(city, slug)")
    .eq("appRole", "owner")
    .not("slug", "is", null);

  const entries: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];

  // City/service discovery pages
  const seen = new Set<string>();
  for (const user of users ?? []) {
    const biz = Array.isArray(user.business) ? user.business[0] : user.business;
    const rawCity = biz?.city?.toLowerCase()?.trim() ?? "";
    const ciudadSlug = KNOWN_CITIES.find(
      (c) => rawCity.includes(c) || c.includes(rawCity)
    );
    if (!ciudadSlug || !user.serviceType) continue;

    const servicios = TYPE_TO_SERVICIOS[user.serviceType] ?? [];
    for (const servicio of servicios) {
      const path = `${ciudadSlug}/${servicio}`;
      if (!seen.has(path)) {
        seen.add(path);
        entries.push({
          url: `${BASE_URL}/${path}`,
          lastModified: new Date(),
          changeFrequency: "daily",
          priority: 0.8,
        });
      }
    }
  }

  // Individual profile pages
  for (const user of users ?? []) {
    const biz = Array.isArray(user.business) ? user.business[0] : user.business;
    const slug = (biz as { slug?: string } | null)?.slug ?? user.slug;
    if (!slug) continue;
    entries.push({
      url: `${BASE_URL}/p/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}
