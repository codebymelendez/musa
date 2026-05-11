"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MagnifyingGlassIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

interface PublicPromotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: string;
  business: { name: string; category: string | null; city: string | null };
  owner: {
    name: string;
    slug: string;
    avatarUrl: string | null;
    serviceType: string | null;
  } | null;
}

const CATEGORIES = [
  { key: "nails",  label: "Uñas"       },
  { key: "hair",   label: "Cabello"    },
  { key: "brows",  label: "Cejas"      },
  { key: "lashes", label: "Pestañas"   },
  { key: "makeup", label: "Maquillaje" },
  { key: "other",  label: "Spa & Más"  },
];

const STATS = [
  { value: "500+",    label: "profesionales activas"  },
  { value: "15,000+", label: "reservas completadas"   },
  { value: "4+",      label: "ciudades en Venezuela"  },
];

const STEPS = [
  {
    n:     "01",
    title: "Busca",
    desc:  "Encuentra tu profesional por servicio, ciudad o nombre del estudio.",
  },
  {
    n:     "02",
    title: "Elige",
    desc:  "Selecciona la fecha y hora disponible directamente desde su perfil.",
  },
  {
    n:     "03",
    title: "Reserva",
    desc:  "Confirma en segundos. Activa notificaciones y recibe recordatorios.",
  },
];

function formatValidUntil(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-VE", {
    day:   "numeric",
    month: "short",
  });
}

export default function HomePage() {
  const router = useRouter();
  const [promotions,   setPromotions]   = useState<PublicPromotion[]>([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    fetch("/api/public/promotions")
      .then((r) => r.json())
      .then((d) => setPromotions(d.promotions ?? []))
      .catch(() => {})
      .finally(() => setPromoLoading(false));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  };

  return (
    <div className="bg-background min-h-screen antialiased text-on-surface">

      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-40 glass-nav border-b border-border-subtle">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="font-display text-[22px] font-light italic text-on-surface tracking-[-0.01em]"
          >
            Musa
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/client"
              className="font-ui text-[13px] font-medium text-on-surface-muted hover:text-on-surface transition-colors px-3 md:px-4 py-2"
            >
              Mis citas
            </Link>
            <Link
              href="/login"
              className="font-ui text-[13px] font-medium bg-on-surface text-surface px-4 md:px-5 py-2 rounded-full hover:opacity-85 transition-opacity"
            >
              Para profesionales
            </Link>
          </nav>
        </div>
      </header>

      <main>

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-16">
          {/* Warm ambient glow — top right */}
          <div
            className="absolute top-0 right-0 w-[520px] h-[520px] rounded-full pointer-events-none bg-primary/[0.06] blur-[110px]"
            style={{ transform: "translate(25%, -25%)" }}
          />
          {/* Secondary ambient — bottom left */}
          <div
            className="absolute bottom-0 left-0 w-[280px] h-[280px] rounded-full pointer-events-none bg-primary/[0.03] blur-[80px]"
            style={{ transform: "translate(-30%, 30%)" }}
          />

          <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 lg:py-28 relative">
            <div className="grid md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_400px] gap-10 lg:gap-16 items-start">

              {/* ─ Left: content ─────────────────────────────────────── */}
              <div className="max-w-[520px]">

                {/* Eyebrow */}
                <p className="font-display text-[10px] font-light uppercase tracking-[0.22em] text-primary mb-8">
                  Reservas de belleza profesional
                </p>

                {/* Headline */}
                <h1
                  className="font-display font-light leading-[0.94] tracking-[-0.02em]"
                  style={{ fontSize: "clamp(42px, 6.5vw, 68px)" }}
                >
                  <span className="block text-on-surface">Tu próxima cita</span>
                  <span className="block text-on-surface">con la profesional</span>
                  <em className="block font-light italic text-primary">que mereces.</em>
                </h1>

                {/* Signature rule */}
                <div className="my-7 flex flex-col gap-[3px]">
                  <div className="h-px w-full bg-primary opacity-35" />
                  <div className="h-[0.5px] w-[55%] opacity-40" style={{ background: "#C4996A" }} />
                </div>

                {/* Subtitle */}
                <p className="font-ui text-[15px] text-on-surface-muted leading-relaxed max-w-[340px]">
                  Manicuristas, estilistas, lashistas y maquilladoras
                  en tu ciudad. Sin llamadas, sin esperas.
                </p>

                {/* Search */}
                <form onSubmit={handleSearch} className="mt-8">
                  <div className="flex items-center gap-3 h-[54px] px-5 bg-surface-raised border border-border rounded-xl shadow-sm focus-within:border-border-focus focus-within:shadow-[0_0_0_3px_rgba(181,89,62,0.09),0_2px_8px_rgba(26,14,11,0.05)] transition-all duration-[240ms]">
                    <MagnifyingGlassIcon className="w-[18px] h-[18px] text-on-surface-subtle flex-shrink-0" />
                    <input
                      className="flex-1 bg-transparent outline-none font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle"
                      placeholder="Busca por servicio, nombre o ciudad..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="flex-shrink-0 w-9 h-9 bg-primary rounded-full flex items-center justify-center text-on-primary hover:bg-primary-hover transition-colors shadow-primary-sm"
                      aria-label="Buscar"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Category quick links */}
                <nav
                  className="mt-5 flex items-center gap-5 overflow-x-auto pb-1 hide-scrollbar"
                  aria-label="Categorías"
                >
                  {CATEGORIES.map(({ key, label }) => (
                    <Link
                      key={key}
                      href={`/explore?category=${key}`}
                      className="flex-shrink-0 font-ui text-[12px] font-medium text-on-surface-subtle hover:text-primary border-b border-transparent hover:border-primary transition-all duration-150 pb-0.5 whitespace-nowrap"
                    >
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* ─ Right: editorial image panel (desktop) ────────────── */}
              <div className="hidden md:block self-stretch">
                <div className="relative h-full min-h-[400px] rounded-2xl overflow-hidden bg-surface-sunken">
                  {/* Replace with <Image> when editorial photo is available */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <div className="flex flex-col gap-[3px] mb-3">
                      <div className="h-px w-2/3 bg-primary opacity-20" />
                      <div className="h-[0.5px] w-2/5 opacity-20" style={{ background: "#C4996A" }} />
                    </div>
                    <p className="font-display text-[9px] font-light uppercase tracking-[0.20em] text-on-surface-subtle opacity-50">
                      Profesionales verificadas
                    </p>
                  </div>
                  <div className="absolute inset-0 bg-primary/[0.03]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Promotions ──────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-5 md:px-8">

            {/* Header */}
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="font-display text-[10px] font-light uppercase tracking-[0.20em] text-primary mb-2">
                  Esta semana
                </p>
                <h2
                  className="font-display font-light italic text-on-surface leading-none"
                  style={{ fontSize: "36px", letterSpacing: "-0.01em" }}
                >
                  Ofertas activas
                </h2>
              </div>
              <Link
                href="/explore"
                className="font-ui text-[13px] font-medium text-on-surface-muted hover:text-on-surface transition-colors mb-1"
              >
                Ver todo
              </Link>
            </div>

            {/* Loading */}
            {promoLoading && (
              <div>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="py-5 border-t border-border-subtle flex items-center gap-5 md:gap-8"
                  >
                    <div className="w-14 h-7 rounded bg-surface-sunken animate-pulse flex-shrink-0" />
                    <div className="hidden sm:block w-px h-7 bg-border-subtle flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-[14px] w-48 rounded bg-surface-sunken animate-pulse" />
                      <div className="h-[11px] w-32 rounded bg-surface-sunken animate-pulse" />
                    </div>
                    <div className="h-[11px] w-20 rounded bg-surface-sunken animate-pulse flex-shrink-0" />
                  </div>
                ))}
                <div className="border-t border-border-subtle" />
              </div>
            )}

            {/* Empty */}
            {!promoLoading && promotions.length === 0 && (
              <div className="py-16 text-center">
                <p
                  className="font-display italic font-light text-on-surface mb-3"
                  style={{ fontSize: "28px" }}
                >
                  Nada esta semana, aún.
                </p>
                <p className="font-ui text-[14px] text-on-surface-muted mb-6">
                  Explora profesionales y encuentra la tuya.
                </p>
                <Link
                  href="/explore"
                  className="font-display italic font-light text-[14px] text-primary underline underline-offset-[3px]"
                >
                  Explorar profesionales →
                </Link>
              </div>
            )}

            {/* Editorial rows */}
            {!promoLoading && promotions.length > 0 && (
              <div>
                {promotions.map((promo) => (
                  <Link
                    key={promo.id}
                    href={promo.owner ? `/p/${promo.owner.slug}` : "/explore"}
                    className="group block"
                  >
                    <div className="py-5 border-t border-border-subtle flex items-center gap-5 md:gap-8 -mx-3 px-3 rounded-lg hover:bg-surface-raised/60 transition-colors duration-200">

                      {/* Discount — editorial Cormorant number */}
                      <div className="flex-shrink-0 w-[60px] text-right">
                        <span
                          className="font-display font-light italic text-primary"
                          style={{ fontSize: "26px", lineHeight: "1" }}
                        >
                          -{promo.discount}%
                        </span>
                      </div>

                      {/* Thin divider */}
                      <div className="hidden sm:block w-px h-8 bg-border-subtle flex-shrink-0" />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="font-ui font-medium text-[14px] md:text-[15px] text-on-surface mb-0.5 truncate">
                          {promo.title}
                        </p>
                        <p
                          className="text-[12px] text-on-surface-muted truncate"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          {promo.owner?.name ?? promo.business.name}
                          {promo.business.city && (
                            <span className="text-on-surface-subtle"> · {promo.business.city}</span>
                          )}
                        </p>
                      </div>

                      {/* Date + arrow */}
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <span
                          className="text-[11px] text-on-surface-subtle whitespace-nowrap"
                          style={{ fontFamily: "var(--font-mono)" }}
                        >
                          hasta {formatValidUntil(promo.validUntil)}
                        </span>
                        <ArrowRightIcon className="w-4 h-4 text-on-surface-subtle group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-150" />
                      </div>
                    </div>
                  </Link>
                ))}
                <div className="border-t border-border-subtle" />
              </div>
            )}
          </div>
        </section>

        {/* ── Segmentation ────────────────────────────────────────────── */}
        <section className="py-4">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <div className="grid md:grid-cols-2 gap-3 md:gap-4">

              {/* Clienta panel */}
              <Link href="/client" className="group block">
                <div
                  className="relative overflow-hidden rounded-2xl p-8 md:p-10 transition-shadow duration-300 hover:shadow-lg"
                  style={{ background: "rgba(237,229,223,0.75)", minHeight: "280px" }}
                >
                  {/* Ambient */}
                  <div
                    className="absolute top-0 right-0 w-60 h-60 rounded-full pointer-events-none bg-primary/[0.07] blur-[64px]"
                    style={{ transform: "translate(30%, -30%)" }}
                  />
                  <div className="relative">
                    <p className="font-display text-[10px] font-light uppercase tracking-[0.20em] text-primary mb-6">
                      Para clientas
                    </p>
                    <h3
                      className="font-display font-light italic text-on-surface leading-[1.08]"
                      style={{ fontSize: "clamp(28px, 4vw, 38px)", letterSpacing: "-0.01em" }}
                    >
                      Reserva con<br />las mejores.
                    </h3>
                    <p className="font-ui text-[14px] text-on-surface-muted mt-4 mb-8 leading-relaxed max-w-[260px]">
                      Encuentra profesionales de belleza en tu ciudad
                      y gestiona tus citas desde un solo lugar.
                    </p>
                    <span className="inline-flex items-center gap-2 font-ui text-[13px] font-medium text-primary">
                      Ver mis citas
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  </div>
                </div>
              </Link>

              {/* Professional panel */}
              <Link href="/login" className="group block">
                <div
                  className="relative overflow-hidden rounded-2xl p-8 md:p-10 bg-espresso-900 transition-shadow duration-300 hover:shadow-xl"
                  style={{ minHeight: "280px" }}
                >
                  {/* Gold ambient */}
                  <div
                    className="absolute top-0 right-0 w-64 h-64 rounded-full pointer-events-none blur-[72px]"
                    style={{ background: "rgba(196,153,106,0.10)", transform: "translate(30%, -30%)" }}
                  />
                  <div className="relative">
                    <p
                      className="font-display text-[10px] font-light uppercase tracking-[0.20em] mb-6"
                      style={{ color: "#C4996A" }}
                    >
                      Para profesionales
                    </p>
                    <h3
                      className="font-display font-light italic leading-[1.08]"
                      style={{
                        fontSize: "clamp(28px, 4vw, 38px)",
                        letterSpacing: "-0.01em",
                        color: "#F2EBE0",
                      }}
                    >
                      Tu negocio,<br />en otro nivel.
                    </h3>
                    <p
                      className="font-ui text-[14px] mt-4 mb-8 leading-relaxed max-w-[260px]"
                      style={{ color: "#B8A496" }}
                    >
                      Agenda digital, gestión de clientas y estadísticas.
                      Todo lo que tu negocio necesita para crecer.
                    </p>
                    <span
                      className="inline-flex items-center gap-2 font-ui text-[13px] font-medium"
                      style={{ color: "#C4996A" }}
                    >
                      Empezar gratis
                      <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <div className="border-t border-b border-border-subtle py-12 md:py-14 grid grid-cols-3 gap-6 md:gap-12">
              {STATS.map(({ value, label }) => (
                <div key={label} className="text-center">
                  <p
                    className="font-display font-light text-on-surface leading-none"
                    style={{ fontSize: "clamp(28px, 5vw, 52px)", letterSpacing: "-0.025em" }}
                  >
                    {value}
                  </p>
                  <p className="font-ui text-[11px] md:text-[12px] text-on-surface-muted mt-2 leading-snug max-w-[80px] mx-auto">
                    {label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ────────────────────────────────────────────── */}
        <section className="py-12 md:py-16">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <p className="font-display text-[10px] font-light uppercase tracking-[0.20em] text-primary mb-3">
              Proceso
            </p>
            <h2
              className="font-display font-light italic text-on-surface mb-12 md:mb-14"
              style={{ fontSize: "34px", letterSpacing: "-0.01em" }}
            >
              Así de simple.
            </h2>

            <div className="grid md:grid-cols-3 gap-10 md:gap-12">
              {STEPS.map(({ n, title, desc }) => (
                <div key={n} className="relative">
                  {/* Ghost background number */}
                  <span
                    className="absolute -top-2 -left-1 font-display font-light text-on-surface pointer-events-none select-none"
                    style={{ fontSize: "88px", opacity: 0.04, lineHeight: "1", letterSpacing: "-0.04em" }}
                    aria-hidden="true"
                  >
                    {n}
                  </span>
                  <div className="relative">
                    <p
                      className="text-[11px] text-on-surface-subtle mb-3"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      {n}
                    </p>
                    <h3
                      className="font-display italic font-light text-on-surface mb-2"
                      style={{ fontSize: "22px", lineHeight: "1.1" }}
                    >
                      {title}
                    </h3>
                    <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Professional CTA ────────────────────────────────────────── */}
        <section className="pb-16 md:pb-20">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <div className="relative overflow-hidden rounded-2xl bg-espresso-900 px-8 py-12 md:px-14 md:py-14">
              {/* Gold ambient */}
              <div
                className="absolute top-0 right-0 w-[380px] h-[380px] rounded-full pointer-events-none blur-[96px]"
                style={{ background: "rgba(196,153,106,0.09)", transform: "translate(25%, -25%)" }}
              />
              {/* Signature rule — decorative, bottom right */}
              <div className="absolute bottom-10 right-12 hidden lg:flex flex-col gap-[3px] w-28">
                <div className="h-px opacity-15" style={{ background: "#C4996A" }} />
                <div className="h-[0.5px] w-3/5 opacity-10" style={{ background: "#C4996A" }} />
              </div>

              <div className="relative max-w-lg">
                <p
                  className="font-display text-[10px] font-light uppercase tracking-[0.20em] mb-6"
                  style={{ color: "#C4996A" }}
                >
                  Para profesionales de belleza
                </p>
                <h2
                  className="font-display font-light italic leading-[1.08] mb-5"
                  style={{
                    fontSize: "clamp(26px, 4vw, 40px)",
                    letterSpacing: "-0.01em",
                    color: "#F2EBE0",
                  }}
                >
                  Tus clientas merecen una mejor experiencia.
                  Tú también.
                </h2>
                <p
                  className="font-ui text-[14px] leading-relaxed mb-8 max-w-[340px]"
                  style={{ color: "#B8A496" }}
                >
                  Agenda digital, perfil público, gestión de clientas,
                  recordatorios automáticos y estadísticas. Todo pensado
                  para el negocio de belleza.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/register"
                    className="font-ui text-[14px] font-medium px-7 py-3 rounded-full transition-opacity hover:opacity-90 shadow-primary-sm"
                    style={{ background: "#B5593E", color: "#FDFAF6" }}
                  >
                    Empezar gratis
                  </Link>
                  <Link
                    href="/login"
                    className="font-ui text-[14px] font-medium px-4 py-3 transition-opacity hover:opacity-60"
                    style={{ color: "#B8A496" }}
                  >
                    Ya tengo cuenta →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="border-t border-border-subtle py-8">
          <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <Link
              href="/"
              className="font-display text-[20px] font-light italic text-on-surface"
            >
              Musa
            </Link>
            <div className="flex items-center gap-5">
              <Link href="/explore" className="font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors">
                Explorar
              </Link>
              <Link href="/client" className="font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors">
                Mis citas
              </Link>
              <Link href="/login" className="font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors">
                Para profesionales
              </Link>
            </div>
            <p className="font-ui text-[11px] text-on-surface-subtle">
              © 2025 Musa ·{" "}
              <a
                href="https://codebymelendez.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-on-surface-muted transition-colors"
              >
                codebymelendez.com
              </a>
            </p>
          </div>
        </footer>

      </main>
    </div>
  );
}
