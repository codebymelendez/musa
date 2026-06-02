import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, MapPinIcon } from "@heroicons/react/24/outline";
import { createAdminClient } from "@/lib/supabase-admin";
import MusaLogo from "@/components/brand/MusaLogo";

export const revalidate = 3600;

// ── Mappings ──────────────────────────────────────────────────────────────────

const CIUDAD_LABEL: Record<string, string> = {
  maracaibo:   "Maracaibo",
  valencia:    "Valencia",
  caracas:     "Caracas",
  barquisimeto: "Barquisimeto",
  maracay:     "Maracay",
};

const SERVICIO_TO_TYPE: Record<string, string> = {
  manicura:       "nails",
  pedicure:       "nails",
  cejas:          "brows",
  maquillaje:     "makeup",
  "unas-acrilicas": "nails",
  cabello:        "hair",
  pestanas:       "lashes",
};

const SERVICIO_PLURAL: Record<string, string> = {
  manicura:       "Manicuristas",
  pedicure:       "Pedicuristas",
  cejas:          "Especialistas en cejas",
  maquillaje:     "Maquilladoras",
  "unas-acrilicas": "Especialistas en uñas acrílicas",
  cabello:        "Estilistas de cabello",
  pestanas:       "Especialistas en pestañas",
};

const SERVICIO_SINGULAR: Record<string, string> = {
  manicura:       "manicura",
  pedicure:       "pedicure",
  cejas:          "cejas y pestañas",
  maquillaje:     "maquillaje",
  "unas-acrilicas": "uñas acrílicas",
  cabello:        "cabello",
  pestanas:       "pestañas",
};

// DB serviceType → all URL slugs it covers (for generateStaticParams)
const TYPE_TO_SERVICIOS: Record<string, string[]> = {
  nails:  ["manicura", "pedicure", "unas-acrilicas"],
  brows:  ["cejas"],
  makeup: ["maquillaje"],
  hair:   ["cabello"],
  lashes: ["pestanas"],
};

const SERVICE_LABEL: Record<string, string> = {
  hair:   "Cabello",
  nails:  "Uñas",
  brows:  "Cejas",
  lashes: "Pestañas",
  makeup: "Maquillaje",
  other:  "Belleza",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface Professional {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  bio: string | null;
  serviceType: string | null;
  business: { name: string; city: string | null } | null;
}

// ── Static params ─────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("User")
    .select("serviceType, business:Business(city)")
    .eq("appRole", "owner")
    .eq("onboardingDone", true)
    .not("serviceType", "is", null);

  if (!data) return [];

  const knownCities = Object.keys(CIUDAD_LABEL);
  const seen = new Set<string>();
  const params: Array<{ ciudad: string; servicio: string }> = [];

  for (const user of data) {
    const biz = Array.isArray(user.business) ? user.business[0] : user.business;
    const rawCity = biz?.city?.toLowerCase()?.trim() ?? "";
    const ciudadSlug = knownCities.find(
      (c) => rawCity.includes(c) || c.includes(rawCity)
    );
    if (!ciudadSlug || !user.serviceType) continue;

    const servicios = TYPE_TO_SERVICIOS[user.serviceType] ?? [];
    for (const servicio of servicios) {
      const key = `${ciudadSlug}/${servicio}`;
      if (!seen.has(key)) {
        seen.add(key);
        params.push({ ciudad: ciudadSlug, servicio });
      }
    }
  }

  return params;
}

// ── Metadata ──────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ciudad: string; servicio: string }>;
}): Promise<Metadata> {
  const { ciudad, servicio } = await params;
  const cityLabel = CIUDAD_LABEL[ciudad];
  const singularLabel = SERVICIO_SINGULAR[servicio];

  if (!cityLabel || !singularLabel) return {};

  const headingPlural = SERVICIO_PLURAL[servicio] ?? servicio;
  const url = `https://getmusa.app/${ciudad}/${servicio}`;

  const title = `${headingPlural} en ${cityLabel} | GetMusa`;
  const description = `Encuentra y reserva con las mejores especialistas en ${singularLabel} en ${cityLabel}. Agenda tu cita online en segundos con GetMusa.`;

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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getProfessionals(
  ciudad: string,
  serviceType: string
): Promise<Professional[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("User")
    .select("id, name, slug, avatarUrl, bio, serviceType, business:Business(name, city)")
    .eq("appRole", "owner")
    .eq("serviceType", serviceType)
    .not("slug", "is", null)
    .order("createdAt", { ascending: false })
    .limit(50);

  if (!data) return [];

  return (data as any[])
    .map((u) => ({
      ...u,
      business: Array.isArray(u.business) ? u.business[0] : u.business,
    }))
    .filter((u) => {
      const city = u.business?.city?.toLowerCase()?.trim() ?? "";
      return city.includes(ciudad.toLowerCase());
    }) as Professional[];
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ProfessionalCard({ professional }: { professional: Professional }) {
  const specialtyLabel = professional.serviceType
    ? (SERVICE_LABEL[professional.serviceType] ?? professional.serviceType)
    : null;

  return (
    <Link href={`/p/${professional.slug}`} className="group block">
      <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-px transition-all duration-200">
        <div className="relative h-28 bg-surface-sunken overflow-hidden">
          {professional.avatarUrl ? (
            <Image
              src={professional.avatarUrl}
              alt={professional.name}
              fill
              className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span
                className="font-display font-normal italic text-on-surface-subtle"
                style={{ fontSize: "52px", lineHeight: "1" }}
              >
                {professional.name[0]}
              </span>
            </div>
          )}
        </div>

        <div className="px-3 py-3 space-y-0.5">
          <p className="font-ui font-medium text-[13px] text-on-surface truncate leading-tight">
            {professional.name}
          </p>
          {specialtyLabel && (
            <p className="font-ui text-[11px] text-primary">{specialtyLabel}</p>
          )}
          {professional.business?.city && (
            <p className="flex items-center gap-1 font-ui text-[11px] text-on-surface-subtle">
              <MapPinIcon className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{professional.business.city}</span>
            </p>
          )}
          <div className="pt-1.5">
            <span className="inline-flex items-center gap-1 font-ui text-[11px] font-medium text-primary group-hover:gap-1.5 transition-all">
              Ver agenda
              <ArrowRightIcon className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl overflow-hidden">
      <div className="h-28 bg-surface-sunken animate-pulse" />
      <div className="px-3 py-3 space-y-2">
        <div className="h-[13px] w-3/4 rounded bg-surface-sunken animate-pulse" />
        <div className="h-[11px] w-1/2 rounded bg-surface-sunken animate-pulse" />
        <div className="h-[11px] w-1/3 rounded bg-surface-sunken animate-pulse" />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function CiudadServicioPage({
  params,
}: {
  params: Promise<{ ciudad: string; servicio: string }>;
}) {
  const { ciudad, servicio } = await params;

  const cityLabel = CIUDAD_LABEL[ciudad];
  const serviceType = SERVICIO_TO_TYPE[servicio];
  const heading = SERVICIO_PLURAL[servicio];
  const singularLabel = SERVICIO_SINGULAR[servicio];

  if (!cityLabel || !serviceType || !heading) notFound();

  const professionals = await getProfessionals(ciudad, serviceType);

  const description = `Encuentra y reserva con las mejores especialistas en ${singularLabel} en ${cityLabel}. Revisa servicios, precios y horarios. Agenda tu cita en segundos, sin WhatsApp ni llamadas.`;

  return (
    <div className="min-h-screen bg-background animate-page">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle">
        <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" aria-label="GetMusa inicio">
            <MusaLogo variant="wordmark" size="sm" />
          </Link>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 font-ui font-medium text-[13px] text-on-surface-muted hover:text-on-surface transition-colors"
          >
            Explorar
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-5 pt-10 pb-8">
        <p className="musa-sublabel mb-2">
          GetMusa · {cityLabel}
        </p>
        <h1
          className="font-display font-normal text-on-surface mb-4 leading-tight"
          style={{ fontSize: "32px", letterSpacing: "-0.015em" }}
        >
          {heading} en {cityLabel}
        </h1>
        <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed max-w-xl">
          {description}
        </p>
      </section>

      {/* Grid */}
      <section className="max-w-4xl mx-auto px-5 pb-16">
        {professionals.length === 0 ? (
          <div className="flex flex-col items-center py-20 text-center px-1">
            <div className="musa-rule w-[60px] mb-8" />
            <p
              className="font-display font-light italic text-on-surface mb-2"
              style={{ fontSize: "26px" }}
            >
              Sin profesionales aún.
            </p>
            <p className="font-ui text-[13px] text-on-surface-muted max-w-[240px] mb-8">
              Pronto habrá especialistas en {singularLabel} en {cityLabel}.
            </p>
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-2.5 rounded-full font-ui font-medium text-[13px] hover:bg-primary-surface transition-colors"
            >
              Explorar otras ciudades
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {professionals.map((pro) => (
              <ProfessionalCard key={pro.id} professional={pro} />
            ))}
          </div>
        )}
      </section>

      {/* Footer minimal */}
      <footer className="border-t border-border-subtle">
        <div className="max-w-4xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-ui text-[12px] text-on-surface-subtle">
            © 2026 GetMusa · Venezuela
          </p>
          <div className="flex items-center gap-5">
            <Link
              href="/explore"
              className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors"
            >
              Explorar
            </Link>
            <Link
              href="/register"
              className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors"
            >
              Soy profesional
            </Link>
            <Link
              href="/"
              className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors"
            >
              Inicio
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
