import { Metadata } from "next";
import { cache } from "react";
import { permanentRedirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase-admin";
import { escapeIlike } from "@/lib/slug";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

const SERVICE_LABEL: Record<string, string> = {
  hair:   "Cabello",
  nails:  "Uñas",
  brows:  "Cejas",
  lashes: "Pestañas",
  makeup: "Maquillaje",
  other:  "Belleza",
};

// El slug público canónico es Business.slug (lookup case-insensitive). Si no
// existe, busca en SlugHistory: un slug antiguo redirige permanentemente al
// slug vigente del negocio — un enlace compartido (bio de Instagram, tarjetas)
// no puede romperse jamás.
const getProfile = cache(async (slug: string) => {
  const admin = createAdminClient();
  const { data: bizRows } = await admin
    .from("Business")
    .select("id, name, slug, city, address, logoUrl, coverUrl, users:User(name, bio, avatarUrl, serviceType, phone, whatsapp, appRole)")
    .ilike("slug", escapeIlike(slug))
    .limit(1);
  const biz = bizRows?.[0];

  if (!biz) {
    const { data: hist } = await admin
      .from("SlugHistory")
      .select("businessId")
      .ilike("slug", escapeIlike(slug))
      .maybeSingle();
    if (hist?.businessId) {
      const { data: current } = await admin
        .from("Business")
        .select("slug")
        .eq("id", hist.businessId)
        .maybeSingle();
      if (current?.slug) {
        permanentRedirect(`/p/${current.slug}`);
      }
    }
    return null;
  }

  const users = Array.isArray(biz.users) ? biz.users : biz.users ? [biz.users] : [];
  const owner = users.find((u: any) => u.appRole === "owner") ?? users[0] ?? null;

  return {
    name: owner?.name ?? biz.name,
    slug: biz.slug,
    bio: owner?.bio ?? null,
    avatarUrl: (biz.logoUrl ?? owner?.avatarUrl ?? null) as string | null,
    serviceType: owner?.serviceType ?? null,
    phone: owner?.phone ?? null,
    whatsapp: owner?.whatsapp ?? null,
    business: { name: biz.name, city: biz.city ?? null, address: biz.address ?? null },
  } as {
    name: string;
    slug: string;
    bio: string | null;
    avatarUrl: string | null;
    serviceType: string | null;
    phone: string | null;
    whatsapp: string | null;
    business: { name: string; city: string | null; address: string | null } | null;
  };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const user = await getProfile(slug);

  if (!user) {
    return { title: "Profesional | MUSA" };
  }

  const specialty = SERVICE_LABEL[user.serviceType ?? ""] ?? user.serviceType ?? null;
  const city = user.business?.city ?? null;
  // Slug y nombre canónicos del Business para canonical/OG
  const displayName = user.business?.name ?? user.name;
  const url = `https://getmusa.app/p/${user.slug}`;

  let title: string;
  if (specialty && city) {
    title = `${displayName} — ${specialty} en ${city} | MUSA`;
  } else if (specialty) {
    title = `${displayName} — ${specialty} | MUSA`;
  } else {
    title = `${displayName} | MUSA`;
  }

  const rawBio = user.bio?.trim();
  const description = rawBio
    ? rawBio.slice(0, 155)
    : `Reserva tu cita con ${displayName} en MUSA.${specialty ? ` ${specialty} · Disponible online.` : " Disponible online."}`;

  const keywords = [
    displayName,
    user.name,
    specialty,
    city,
    "reserva online",
    "cita",
    "belleza Venezuela",
    "MUSA",
  ].filter(Boolean) as string[];

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: "MUSA",
      locale: "es_VE",
      type: "profile",
      ...(user.avatarUrl
        ? { images: [{ url: user.avatarUrl, width: 400, height: 400, alt: user.name }] }
        : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(user.avatarUrl ? { images: [user.avatarUrl] } : {}),
    },
  };
}

export default async function ProfileLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const user = await getProfile(slug);

  const telephone = user?.whatsapp ?? user?.phone ?? null;

  const jsonLd = user
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: user.business?.name ?? user.name,
        ...(user.bio ? { description: user.bio } : {}),
        url: `https://getmusa.app/p/${user.slug}`,
        ...(telephone ? { telephone } : {}),
        ...(user.business?.address
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: user.business.address,
                ...(user.business.city ? { addressLocality: user.business.city } : {}),
                addressCountry: "VE",
              },
            }
          : {}),
        ...(user.avatarUrl ? { image: user.avatarUrl } : {}),
        priceRange: "$$",
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
