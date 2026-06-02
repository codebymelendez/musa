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
    .select("name, slug, bio, avatarUrl, serviceType, business:Business(name, city)")
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
    business: { name: string; city: string | null } | null;
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
    return { title: "Profesional | GetMusa" };
  }

  const city = user.business?.city ?? "Venezuela";
  const specialty = SERVICE_LABEL[user.serviceType ?? ""] ?? user.serviceType ?? "belleza";
  const specialtyLower = specialty.toLowerCase();
  const url = `https://getmusa.app/p/${slug}`;

  const title = `${user.name} – ${specialty} en ${city} | GetMusa`;
  const description = `Reserva con ${user.name}, especialista en ${specialtyLower} en ${city}. Sin WhatsApp, sin espera. Agenda tu cita en GetMusa.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "GetMusa",
      locale: "es_VE",
      type: "website",
      ...(user.avatarUrl
        ? { images: [{ url: user.avatarUrl, width: 400, height: 400, alt: user.name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(user.avatarUrl ? { images: [user.avatarUrl] } : {}),
    },
  };
}

export default async function ProfileLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const user = await getProfile(slug);

  const city = user?.business?.city ?? "Venezuela";
  const specialty = user?.serviceType
    ? (SERVICE_LABEL[user.serviceType] ?? user.serviceType)
    : "Servicios de belleza";

  const jsonLd = user
    ? {
        "@context": "https://schema.org",
        "@type": "LocalBusiness",
        name: user.name,
        description: specialty,
        address: {
          "@type": "PostalAddress",
          addressLocality: city,
          addressCountry: "VE",
        },
        url: `https://getmusa.app/p/${slug}`,
        ...(user.avatarUrl ? { image: user.avatarUrl } : {}),
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
