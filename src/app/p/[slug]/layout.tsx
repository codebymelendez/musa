import { Metadata } from "next";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase-admin";

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

const getProfile = cache(async (slug: string) => {
  const admin = createAdminClient();
  const { data } = await admin
    .from("User")
    .select("name, slug, bio, avatarUrl, serviceType, phone, whatsapp, business:Business(name, city, address)")
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  return {
    ...data,
    business: Array.isArray(data.business) ? data.business[0] : data.business,
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
  const url = `https://getmusa.app/p/${slug}`;

  let title: string;
  if (specialty && city) {
    title = `${user.name} — ${specialty} en ${city} | MUSA`;
  } else if (specialty) {
    title = `${user.name} — ${specialty} | MUSA`;
  } else {
    title = `${user.name} | MUSA`;
  }

  const rawBio = user.bio?.trim();
  const description = rawBio
    ? rawBio.slice(0, 155)
    : `Reserva tu cita con ${user.name} en MUSA.${specialty ? ` ${specialty} · Disponible online.` : " Disponible online."}`;

  const keywords = [
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
        url: `https://getmusa.app/p/${slug}`,
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
