import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ChevronDownIcon, DevicePhoneMobileIcon, MapPinIcon, ScissorsIcon } from "@heroicons/react/24/outline";
import MusaLogo from "@/components/brand/MusaLogo";
import HomeSearch from "@/components/HomeSearch";
import IOSInstallHint from "@/components/IOSInstallHint";
import { createAdminClient } from "@/lib/supabase-admin";

// ISR: revalidar cada 60s
export const revalidate = 60;

export const metadata: Metadata = {
  title: "GetMusa – Reserva con profesionales de belleza en Venezuela",
  description:
    "Encuentra y reserva con manicuristas, estilistas y especialistas de belleza en Maracaibo, Valencia y Caracas. Sin WhatsApp, en segundos.",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface PublicPromotion {
  id: string;
  title: string;
  discount: number;
  validUntil: string;
  business: { name: string; city: string | null } | null;
  owner: { name: string; slug: string } | null;
}

interface FeaturedUser {
  id: string;
  name: string;
  slug: string;
  avatarUrl: string | null;
  bio: string | null;
  serviceType: string | null;
  business: { name: string; city: string | null } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SERVICE_TYPE_LABEL: Record<string, string> = {
  hair: "Cabello",
  nails: "Uñas",
  brows: "Cejas",
  lashes: "Pestañas",
  makeup: "Maquillaje",
  other: "Belleza",
};

// ── Data fetching ─────────────────────────────────────────────────────────────

async function getPublicPromotions(): Promise<PublicPromotion[]> {
  try {
    const admin = createAdminClient();
    const now = new Date().toISOString();
    const { data } = await admin
      .from("Promotion")
      .select(`
        id, title, discount, validUntil,
        business:Business(name, city),
        owner:User!inner(name, slug)
      `)
      .eq("isActive", true)
      .lte("validFrom", now)
      .gte("validUntil", now)
      .order("createdAt", { ascending: false })
      .limit(8);

    return (data ?? []).map((p) => ({
      ...p,
      business: Array.isArray(p.business) ? p.business[0] : p.business,
      owner: Array.isArray(p.owner) ? p.owner[0] : p.owner,
    }));
  } catch {
    return [];
  }
}

/** Top 8 profesionales por citas completadas en los últimos 30 días.
 *  Fallback: las más recientemente registradas si hay menos de 3. */
async function getFeaturedProfessionals(): Promise<FeaturedUser[]> {
  try {
    const admin = createAdminClient();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: appointments } = await admin
      .from("Appointment")
      .select("userId")
      .eq("status", "completed")
      .gte("startTime", thirtyDaysAgo)
      .limit(1000);

    const countMap: Record<string, number> = {};
    for (const apt of appointments ?? []) {
      countMap[apt.userId] = (countMap[apt.userId] || 0) + 1;
    }

    const topIds = Object.entries(countMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => id);

    // Fallback si hay pocos resultados
    if (topIds.length < 3) {
      const { data: recent } = await admin
        .from("User")
        .select("id, name, slug, avatarUrl, bio, serviceType, business:Business(name, city)")
        .eq("appRole", "owner")
        .order("createdAt", { ascending: false })
        .limit(8);
      return (recent ?? []).map((u) => ({
        ...u,
        business: Array.isArray(u.business) ? u.business[0] : u.business,
      }));
    }

    const { data: users } = await admin
      .from("User")
      .select("id, name, slug, avatarUrl, bio, serviceType, business:Business(name, city)")
      .in("id", topIds);

    return (users ?? [])
      .map((u) => ({
        ...u,
        business: Array.isArray(u.business) ? u.business[0] : u.business,
        sortOrder: topIds.indexOf(u.id),
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  } catch {
    return [];
  }
}

/** Profesionales con foto + bio + al menos un servicio con precio (perfil completo). */
async function getFeaturedBusinesses(): Promise<FeaturedUser[]> {
  try {
    const admin = createAdminClient();

    const { data: users } = await admin
      .from("User")
      .select(`
        id, name, slug, avatarUrl, bio, serviceType,
        business:Business(name, city),
        services:Service(isActive, price)
      `)
      .eq("appRole", "owner")
      .not("avatarUrl", "is", null)
      .not("bio", "is", null)
      .order("createdAt", { ascending: false })
      .limit(50);

    const list = (users ?? [])
      .filter((u) => {
        const svcs = Array.isArray(u.services) ? u.services : [];
        return svcs.some((s: { isActive: boolean; price: number }) => s.isActive && s.price > 0);
      })
      .map((u) => ({
        ...u,
        business: Array.isArray(u.business) ? u.business[0] : u.business,
      }))
      .slice(0, 8);

    // AurisGlam siempre en primer lugar
    const aurisIdx = list.findIndex(
      (u) =>
        u.slug?.toLowerCase().includes("aurisglam") ||
        u.name?.toLowerCase().includes("aurisglam"),
    );
    if (aurisIdx > 0) {
      const [auris] = list.splice(aurisIdx, 1);
      list.unshift(auris);
    }

    return list;
  } catch {
    return [];
  }
}

// ── Static data ───────────────────────────────────────────────────────────────

const STATS = [
  { value: "500+", label: "profesionales activas" },
  { value: "15,000+", label: "reservas completadas" },
  { value: "4+", label: "ciudades en Venezuela" },
];

const FAQ_ITEMS = [
  {
    q: "¿Qué es GetMusa?",
    a: "GetMusa es la primera plataforma de reservas de belleza en Venezuela. Permite reservar citas con manicuristas y profesionales de belleza en Maracaibo, Valencia y Caracas en segundos, sin WhatsApp.",
  },
  {
    q: "¿Cómo reservo una cita en GetMusa?",
    a: "Busca tu profesional por ciudad o servicio, selecciona el día y la hora disponible, y confirma. Recibes un recordatorio automático antes de tu cita.",
  },
  {
    q: "¿Es gratis usar GetMusa?",
    a: "Para las clientas es completamente gratuito. Las profesionales tienen un plan gratuito para empezar.",
  },
  {
    q: "¿En qué ciudades de Venezuela está disponible GetMusa?",
    a: "Actualmente disponible en Maracaibo, Valencia y Caracas, con expansión continua.",
  },
  {
    q: "¿Cómo me registro como profesional en GetMusa?",
    a: "Entra a getmusa.app, selecciona 'Empezar gratis' y completa tu perfil en menos de 10 minutos.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
    "@type": "Question",
    name: q,
    acceptedAnswer: { "@type": "Answer", text: a },
  })),
};

const STEPS = [
  { n: "01", title: "Busca", desc: "Encuentra tu profesional por servicio, ciudad o nombre del estudio." },
  { n: "02", title: "Elige", desc: "Selecciona la fecha y hora disponible directamente desde su perfil." },
  { n: "03", title: "Reserva", desc: "Confirma en segundos. Activa notificaciones y recibe recordatorios automáticos." },
];

const PREVIEW_APTS = [
  { time: "10:00", name: "Valentina R.", service: "Manicure Semipermanente", confirmed: true, isNext: true },
  { time: "13:30", name: "Sofía M.", service: "Balayage + Corte", confirmed: true, isNext: false },
  { time: "16:00", name: "Camila T.", service: "Extensiones Clásicas", confirmed: false, isNext: false },
];

// ── Sub-components ────────────────────────────────────────────────────────────

async function PromoList() {
  const promotions = await getPublicPromotions();

  if (promotions.length === 0) {
    return (
      <div className="py-14">
        <div className="mx-auto mb-8" style={{ width: "80px" }}>
          <div className="h-px bg-primary" style={{ opacity: 0.26 }} />
          <div className="h-[0.5px] mt-[3px]" style={{ width: "55%", background: "#C4996A", opacity: 0.18 }} />
        </div>
        <div className="text-center max-w-xs mx-auto">
          <p className="font-display font-light italic text-on-surface mb-3" style={{ fontSize: "26px", letterSpacing: "-0.01em" }}>
            Sin ofertas esta semana.
          </p>
          <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed mb-8">
            Cuando una profesional publique un descuento, lo encontrarás aquí.
          </p>
          <Link href="/explore" className="inline-flex items-center gap-2 font-ui text-[13px] font-medium px-5 py-2.5 rounded-full border border-border hover:border-primary-border hover:text-primary hover:bg-primary-surface transition-all duration-150">
            Ver profesionales
            <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {promotions.map((promo) => (
        <Link key={promo.id} href={promo.owner ? `/p/${promo.owner.slug}` : "/explore"} className="group block">
          <div className="py-5 border-t border-border-subtle flex items-center gap-5 md:gap-8 -mx-3 px-3 rounded-lg hover:bg-surface-tinted/50 transition-colors duration-200">
            <div className="flex-shrink-0 w-[72px] text-right">
              <span className="font-display font-normal text-primary" style={{ fontSize: "34px", lineHeight: "1" }}>
                -{promo.discount}%
              </span>
            </div>
            <div className="hidden sm:block w-px h-9 bg-border-subtle flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-ui font-medium text-[14px] md:text-[15px] text-on-surface mb-0.5 truncate">{promo.title}</p>
              <p className="font-ui text-[12px] text-on-surface-muted truncate">
                {promo.owner?.name ?? promo.business?.name}
                {promo.business?.city && <span className="text-on-surface-subtle"> · {promo.business.city}</span>}
              </p>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <span className="font-mono-num text-[11px] text-on-surface-subtle whitespace-nowrap">
                hasta{" "}
                {new Date(promo.validUntil).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
              </span>
              <ArrowRightIcon className="w-4 h-4 text-on-surface-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" />
            </div>
          </div>
        </Link>
      ))}
      <div className="border-t border-border-subtle" />
    </div>
  );
}

function PromoSkeleton() {
  return (
    <div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="py-5 border-t border-border-subtle flex items-center gap-5 md:gap-8">
          <div className="w-16 h-9 rounded bg-surface-sunken animate-pulse flex-shrink-0" />
          <div className="hidden sm:block w-px h-7 bg-border-subtle flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-[14px] w-44 rounded bg-surface-sunken animate-pulse" />
            <div className="h-[11px] w-28 rounded bg-surface-sunken animate-pulse" />
          </div>
          <div className="h-[11px] w-20 rounded bg-surface-sunken animate-pulse flex-shrink-0" />
        </div>
      ))}
      <div className="border-t border-border-subtle" />
    </div>
  );
}

/** Card de profesional/negocio para las filas de destacados */
function FeaturedCard({ user }: { user: FeaturedUser }) {
  const specialtyLabel = user.serviceType
    ? (SERVICE_TYPE_LABEL[user.serviceType] ?? user.serviceType)
    : null;
  const city = (user.business as { city?: string | null } | null)?.city ?? null;
  const href = `/p/${user.slug}`;

  return (
    <Link href={href} className="group flex-shrink-0 w-40 md:w-44 block">
      {/* Foto */}
      <div className="relative h-28 rounded-t-xl overflow-hidden bg-[#EDE5DF]">
        {user.avatarUrl ? (
          <Image
            src={user.avatarUrl}
            alt={user.name}
            fill
            className="object-cover group-hover:scale-[1.04] transition-transform duration-300"
            sizes="176px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span
              className="font-display font-normal italic text-[56px] leading-none"
              style={{ color: "#C4996A", opacity: 0.4 }}
            >
              {user.name[0]}
            </span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#1A0E0B]/30 to-transparent pointer-events-none" />
      </div>

      {/* Texto */}
      <div
        className="rounded-b-xl border border-t-0 border-border-subtle px-3 py-3 space-y-0.5 group-hover:border-primary-border transition-colors duration-200"
        style={{ background: "rgba(250,246,242,0.95)" }}
      >
        <p className="font-ui font-medium text-[13px] text-on-surface truncate leading-tight">{user.name}</p>
        {specialtyLabel && (
          <p className="font-ui text-[11px] text-primary capitalize">{specialtyLabel}</p>
        )}
        {city && (
          <p className="flex items-center gap-1 font-ui text-[11px] text-on-surface-subtle">
            <MapPinIcon className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{city}</span>
          </p>
        )}
        <div className="pt-1.5">
          <span className="inline-flex items-center gap-1 font-ui text-[11px] font-medium text-primary group-hover:gap-1.5 transition-all">
            Ver agenda
            <ArrowRightIcon className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/** Fila horizontal con scroll de cards */
async function FeaturedProfessionalsRow() {
  const users = await getFeaturedProfessionals();
  if (users.length === 0) return null;

  return (
    <section className="py-8 md:py-10">
      <div className="max-w-6xl mx-auto">
        <div className="px-5 md:px-8 flex items-end justify-between mb-5">
          <div>
            <p className="musa-sublabel text-on-surface-subtle mb-1.5">Reserva ahora</p>
            <h2 className="font-display font-normal italic text-on-surface" style={{ fontSize: "28px", letterSpacing: "-0.015em" }}>
              Reserva con una profesional.
            </h2>
            <p className="font-ui text-[13px] text-on-surface-muted mt-1.5">
              Encuentra especialistas en tu ciudad. Disponibilidad en tiempo real.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 font-ui text-[12px] font-medium text-on-surface-muted hover:text-on-surface transition-colors self-end flex-shrink-0 ml-4"
          >
            Ver todas
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>

        {/* Scroll horizontal */}
        <div className="flex gap-3 overflow-x-auto px-5 md:px-8 pb-3 hide-scrollbar">
          {users.map((u) => (
            <FeaturedCard key={u.id} user={u} />
          ))}
        </div>
      </div>
    </section>
  );
}

async function FeaturedBusinessesRow() {
  const users = await getFeaturedBusinesses();
  if (users.length === 0) return null;

  return (
    <section className="pb-8 md:pb-10">
      <div className="max-w-6xl mx-auto">
        <div className="px-5 md:px-8 flex items-end justify-between mb-5">
          <div>
            <p className="musa-sublabel text-on-surface-subtle mb-1.5">Perfiles completos</p>
            <h2 className="font-display font-normal italic text-on-surface" style={{ fontSize: "28px", letterSpacing: "-0.015em" }}>
              Negocios destacados.
            </h2>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1 font-ui text-[12px] font-medium text-on-surface-muted hover:text-on-surface transition-colors self-end"
          >
            Ver todos
            <ArrowRightIcon className="w-3 h-3" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto px-5 md:px-8 pb-3 hide-scrollbar">
          {users.map((u) => (
            <FeaturedCard key={u.id} user={u} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturedRowSkeleton({ title }: { title: string }) {
  return (
    <section className="py-8 md:py-10">
      <div className="max-w-6xl mx-auto px-5 md:px-8">
        <div className="h-[18px] w-52 rounded bg-surface-sunken animate-pulse mb-5" />
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <div className="h-28 rounded-t-xl bg-surface-sunken animate-pulse" />
              <div className="h-20 rounded-b-xl bg-surface-sunken/60 animate-pulse mt-0.5" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <div className="bg-background min-h-screen antialiased text-on-surface">

        {/* ── Nav ─────────────────────────────────────────────────────── */}
        <header className="fixed top-0 w-full z-40 glass-nav border-b border-border-subtle">
          <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-3">
            <Link href="/" className="flex-shrink-0">
              <span className="md:hidden"><MusaLogo variant="monogram" size="sm" /></span>
              <span className="hidden md:inline-flex"><MusaLogo variant="combo" size="md" /></span>
            </Link>
            <nav className="flex items-center gap-1.5 md:gap-2">
              <a
                href="https://www.instagram.com/getmusa.app"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Musa en Instagram"
                className="hidden md:flex items-center justify-center w-8 h-8 text-on-surface-muted hover:text-primary transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]" aria-hidden="true">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                </svg>
              </a>
              <Link href="/client" className="font-ui text-[12px] sm:text-[13px] font-medium text-on-surface-muted hover:text-on-surface transition-colors px-2.5 sm:px-3 md:px-4 py-2 whitespace-nowrap">
                Mis citas
              </Link>
              <Link href="/login" className="font-ui text-[12px] sm:text-[13px] font-medium bg-on-surface text-surface px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 rounded-full hover:opacity-85 transition-opacity whitespace-nowrap">
                <span className="sm:hidden">Profesionales</span>
                <span className="hidden sm:inline">Para profesionales</span>
              </Link>
            </nav>
          </div>
        </header>

        <main>

          {/* ── Hero ─────────────────────────────────────────────────────── */}
          <section className="relative pt-16">
            <div className="grid md:grid-cols-2">

              {/* Columna profesionales — terracota */}
              <div className="bg-primary flex flex-col justify-between px-8 py-12 md:px-12 md:py-16 lg:px-16 min-h-[360px]">
                <div>
                  <p
                    className="font-ui font-medium text-[10.5px] uppercase tracking-[0.12em] mb-6"
                    style={{ color: "rgba(255,255,255,0.55)" }}
                  >
                    Para profesionales
                  </p>
                  <h2
                    className="font-display font-normal text-on-primary leading-[0.95]"
                    style={{ fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}
                  >
                    Deja de gestionar<br />tu negocio
                    <em className="block font-light italic" style={{ marginTop: "0.04em" }}>
                      por WhatsApp.
                    </em>
                  </h2>
                  <p
                    className="font-ui text-[14px] mt-5 mb-8 leading-relaxed max-w-[300px]"
                    style={{ color: "rgba(255,255,255,0.68)" }}
                  >
                    Agenda digital, perfil público y recordatorios automáticos. Tus clientas reservan solas, tú solo trabajas.
                  </p>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-2 font-ui font-medium text-[14px] bg-on-primary text-primary px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
                  >
                    Empezar gratis
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
                <div
                  className="mt-10 pt-6 border-t space-y-1.5"
                  style={{ borderColor: "rgba(255,255,255,0.14)" }}
                >
                  <p className="font-ui text-[12px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                    ✓ Más de 500 profesionales activas
                  </p>
                  <p className="font-ui text-[12px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                    ✓ Maracaibo · Valencia · Caracas
                  </p>
                </div>
              </div>

              {/* Columna clientas — crema */}
              <div className="bg-background flex flex-col justify-start px-8 py-12 md:px-12 md:py-16 lg:px-16 min-h-[360px] border-t md:border-t-0 md:border-l border-border-subtle">
                <p className="musa-sublabel text-on-surface-subtle mb-6">Para clientas</p>
                <h1
                  className="font-display font-normal text-on-surface leading-[0.95]"
                  style={{ fontSize: "clamp(28px, 3.5vw, 44px)", letterSpacing: "-0.02em" }}
                >
                  Reserva con tu<br />profesional favorita
                  <em className="block font-light italic text-primary" style={{ marginTop: "0.04em" }}>
                    en 30 segundos.
                  </em>
                </h1>
                <p className="font-ui text-[14px] text-on-surface-muted mt-5 leading-relaxed max-w-[300px]">
                  Sin WhatsApp. Sin esperar respuesta. Elige, selecciona tu hora y listo.
                </p>
                <HomeSearch />
                <div className="mt-5">
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-1.5 font-ui font-medium text-[13px] text-primary hover:bg-primary-surface rounded-full px-4 py-2 border border-primary-border transition-colors"
                  >
                    Explorar profesionales
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>
          </section>

          {/* ── Stats bar ────────────────────────────────────────────────── */}
          <div className="bg-surface-sunken border-b border-border-subtle">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-3 divide-x divide-border-subtle">
                {STATS.map(({ value, label }) => (
                  <div key={label} className="text-center px-4 py-5 md:py-6">
                    <p
                      className="font-display font-normal text-on-surface leading-none"
                      style={{ fontSize: "clamp(22px, 3.5vw, 38px)", letterSpacing: "-0.03em" }}
                    >
                      {value}
                    </p>
                    <p className="font-ui text-[11px] text-on-surface-muted mt-1.5 leading-snug">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Fila 1: Negocios destacados ──────────────────────────────── */}
          <Suspense fallback={<FeaturedRowSkeleton title="Negocios destacados" />}>
            <FeaturedBusinessesRow />
          </Suspense>

          {/* ── Fila 2: Profesionales recomendadas ───────────────────────── */}
          <Suspense fallback={<FeaturedRowSkeleton title="Profesionales recomendadas" />}>
            <FeaturedProfessionalsRow />
          </Suspense>

          {/* ── Promotions ───────────────────────────────────────────────── */}
          <section className="py-14 md:py-20">
            <div className="max-w-6xl mx-auto px-5 md:px-8">
              <div className="flex items-end justify-between mb-8">
                <div>
                  <p className="musa-sublabel text-on-surface-subtle mb-2">Ofertas</p>
                  <h2 className="font-display font-normal italic text-on-surface leading-none" style={{ fontSize: "38px", letterSpacing: "-0.015em" }}>
                    Esta semana.
                  </h2>
                </div>
                <Link href="/explore" className="inline-flex items-center gap-1 font-ui text-[13px] font-medium text-on-surface-muted hover:text-on-surface transition-colors self-end">
                  Ver todo
                  <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>
              <Suspense fallback={<PromoSkeleton />}>
                <PromoList />
              </Suspense>
            </div>
          </section>

          {/* ── Segmentation cards ──────────────────────────────────────── */}
          <section className="py-6 md:py-8">
            <div className="max-w-6xl mx-auto px-5 md:px-8">
              <div className="grid md:grid-cols-2 gap-3 md:gap-4">

                <Link href="/client" className="group block">
                  <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 transition-all duration-300 hover:shadow-lg" style={{ background: "rgba(237,229,223,0.80)", minHeight: "300px", border: "1px solid rgba(181,89,62,0.10)" }}>
                    <div className="absolute top-6 right-6 w-[52px] h-[52px] pointer-events-none" style={{ borderTop: "1.5px solid rgba(181,89,62,0.30)", borderRight: "1.5px solid rgba(181,89,62,0.30)" }} />
                    <div className="relative">
                      <p className="musa-sublabel text-on-surface-subtle mb-6">Para clientas</p>
                      <h3 className="font-display font-normal italic text-on-surface leading-[1.06]" style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.015em" }}>
                        Reserva con<br />las mejores.
                      </h3>
                      <p className="font-ui text-[14px] text-on-surface-muted mt-4 mb-8 leading-relaxed max-w-[260px]">
                        Encuentra profesionales de belleza en tu ciudad y gestiona tus citas desde un solo lugar.
                      </p>
                      <span className="inline-flex items-center gap-2 font-ui text-[13px] font-medium text-primary">
                        Ver mis citas
                        <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                      </span>
                    </div>
                  </div>
                </Link>

                <Link href="/login" className="group block">
                  <div className="relative overflow-hidden rounded-2xl p-8 md:p-10 transition-all duration-300 hover:shadow-xl" style={{ background: "#1A0E0B", minHeight: "300px" }}>
                    <div className="absolute top-6 right-6 w-[52px] h-[52px] pointer-events-none" style={{ borderTop: "1.5px solid rgba(196,153,106,0.28)", borderRight: "1.5px solid rgba(196,153,106,0.28)" }} />
                    <div className="relative">
                      <p className="musa-sublabel mb-6" style={{ color: "#6B5040" }}>Para profesionales</p>
                      <h3 className="font-display font-normal italic leading-[1.06]" style={{ fontSize: "clamp(30px, 4.5vw, 44px)", letterSpacing: "-0.015em", color: "#F2EBE0" }}>
                        Tu negocio,<br />en otro nivel.
                      </h3>
                      <p className="font-ui text-[14px] mt-4 mb-8 leading-relaxed max-w-[260px]" style={{ color: "#8B7060" }}>
                        Agenda digital, gestión de clientas y estadísticas. Todo lo que tu negocio necesita para crecer.
                      </p>
                      <span className="inline-flex items-center gap-2 font-ui text-[13px] font-medium px-4 py-2 rounded-full" style={{ border: "1px solid rgba(196,153,106,0.32)", color: "#C4996A" }}>
                        Empezar gratis
                        <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────────────────── */}
          <section className="py-10 md:py-14">
            <div className="max-w-6xl mx-auto px-5 md:px-8">
              <p className="musa-sublabel text-on-surface-subtle mb-3">Proceso</p>
              <h2 className="font-display font-normal italic text-on-surface mb-12 md:mb-14" style={{ fontSize: "36px", letterSpacing: "-0.015em" }}>
                Así de simple.
              </h2>
              <div className="grid md:grid-cols-3 gap-10 md:gap-12">
                {STEPS.map(({ n, title, desc }) => (
                  <div key={n}>
                    <p className="font-mono-num text-[11px] text-on-surface-subtle mb-4">{n}</p>
                    <h3 className="font-display font-normal text-on-surface mb-2.5" style={{ fontSize: "22px", lineHeight: "1.1" }}>{title}</h3>
                    <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Professional CTA ─────────────────────────────────────────── */}
          <section className="pb-14 md:pb-20">
            <div className="max-w-6xl mx-auto px-5 md:px-8">
              <div className="relative overflow-hidden rounded-2xl px-8 py-12 md:px-14 md:py-14" style={{ background: "#1A0E0B" }}>
                <span aria-hidden="true" className="absolute -right-10 -top-16 font-display select-none pointer-events-none leading-none font-normal italic" style={{ fontSize: "440px", color: "#C4996A", opacity: 0.045, letterSpacing: "-0.04em" }}>M</span>
                <div className="relative max-w-lg">
                  <p className="musa-sublabel mb-6" style={{ color: "#6B5040" }}>Para profesionales de belleza</p>
                  <h2 className="font-display font-normal italic leading-[1.06] mb-5" style={{ fontSize: "clamp(28px, 4.5vw, 46px)", letterSpacing: "-0.015em", color: "#F2EBE0" }}>
                    Tu marca. Tu agenda.<br />Tu negocio.
                  </h2>
                  <p className="font-ui text-[14px] leading-relaxed mb-8 max-w-[340px]" style={{ color: "#8B7060" }}>
                    Agenda digital, perfil público, gestión de clientas, recordatorios automáticos y estadísticas.
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <Link href="/login" className="font-ui text-[14px] font-medium px-7 py-3 rounded-full bg-primary text-on-primary transition-opacity hover:opacity-90 shadow-primary-sm">
                      Empezar gratis
                    </Link>
                    <Link href="/login" className="inline-flex items-center gap-1.5 font-ui text-[14px] font-medium px-4 py-3 transition-opacity hover:opacity-60" style={{ color: "#8B7060" }}>
                      Ya tengo cuenta
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── FAQ ──────────────────────────────────────────────────────── */}
          <section className="py-14 md:py-20" id="faq">
            <div className="max-w-6xl mx-auto px-5 md:px-8">
              <p className="musa-sublabel text-on-surface-subtle mb-3">Preguntas frecuentes</p>
              <h2
                className="font-display font-normal italic text-on-surface mb-10"
                style={{ fontSize: "32px", letterSpacing: "-0.015em" }}
              >
                Todo lo que necesitas saber.
              </h2>
              <div className="max-w-2xl">
                {FAQ_ITEMS.map(({ q, a }) => (
                  <details key={q} className="group border-b border-border-subtle">
                    <summary className="flex items-center justify-between py-4 cursor-pointer list-none gap-4">
                      <span className="font-ui font-medium text-[15px] text-on-surface">{q}</span>
                      <ChevronDownIcon className="w-4 h-4 text-on-surface-subtle flex-shrink-0 transition-transform duration-200 group-open:rotate-180" />
                    </summary>
                    <div className="pb-5 pr-8">
                      <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed">{a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <IOSInstallHint />

          {/* ── App stores ───────────────────────────────────────────────── */}
          <section className="py-16 px-4" style={{ background: "#FAF9F7" }}>
            <div className="max-w-2xl mx-auto text-center">
              <p className="musa-sublabel text-on-surface-subtle mb-4">Próximamente</p>
              <h2
                className="font-display font-normal text-primary mb-4"
                style={{ fontSize: "clamp(28px, 4vw, 38px)", letterSpacing: "-0.02em" }}
              >
                Pronto en tu teléfono
              </h2>
              <p className="font-ui text-[15px] text-on-surface-muted leading-relaxed mb-10 max-w-sm mx-auto">
                MUSA llega a iOS y Android. Gestiona tu negocio desde cualquier lugar.
              </p>

              <div className="flex items-center justify-center gap-4 flex-wrap">
                <div className="flex-shrink-0 hover:scale-[1.02] transition-transform duration-200 cursor-default">
                  {/* Badge oficial Apple App Store */}
                  <Image
                    src="/logo_app_store.svg"
                    alt="App Store Badge"
                    width={138}
                    height={46}
                    className="h-[46px] w-auto flex-shrink-0"
                  />
                </div>

                <div
                  className="flex items-center gap-3.5 px-5 py-3 rounded-xl border bg-surface-raised text-left hover:border-primary transition-colors duration-200"
                  style={{ borderColor: "#34271E" }}
                >
                  {/* Icono oficial Google Play Store */}
                  <Image
                    src="/google-play.svg"
                    alt="Google Play Logo"
                    width={22}
                    height={22}
                    className="w-[22px] h-[22px] flex-shrink-0"
                  />
                  <div>
                    <p className="font-ui text-[9px] text-on-surface-subtle uppercase tracking-wider leading-none mb-1">Próximamente en</p>
                    <p className="font-ui font-semibold text-[15px] text-[#34271E] leading-none">Google Play</p>
                  </div>
                </div>
              </div>

              <p className="font-ui text-[12px] text-on-surface-subtle mt-8 leading-relaxed">
                Regístrate en{" "}
                <a
                  href="https://getmusa.app"
                  className="text-primary hover:underline underline-offset-2 transition-colors"
                >
                  getmusa.app
                </a>{" "}
                para ser la primera en enterarte del lanzamiento.
              </p>
            </div>
          </section>

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <footer className="border-t border-border-subtle py-8">
            <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <Link href="/" className="flex-shrink-0">
                <span className="md:hidden"><MusaLogo variant="monogram" size="sm" /></span>
                <span className="hidden md:inline-flex"><MusaLogo variant="combo" size="md" /></span>
              </Link>
              <div className="flex items-center gap-5">
                <Link href="/explore" className="font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors">Explorar</Link>
                <Link href="/client" className="font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors">Mis citas</Link>
                <Link href="/login" className="font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors">Para profesionales</Link>
                <Link href="/sobre" className="font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors">Qué es GetMusa</Link>
                <a href="https://www.instagram.com/getmusa.app" target="_blank" rel="noopener noreferrer" aria-label="Musa en Instagram" className="text-on-surface-muted hover:text-primary transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px]" aria-hidden="true">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
                  </svg>
                </a>
              </div>
              <p className="font-ui text-[11px] text-on-surface-subtle">
                © {new Date().getFullYear()} Musa ·{" "}
                <a href="https://codebymelendez.com" target="_blank" rel="noopener noreferrer" className="hover:text-on-surface-muted transition-colors">
                  codebymelendez.com
                </a>
              </p>
            </div>
          </footer>
        </main>
      </div>
    </>
  );
}
