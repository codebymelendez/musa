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
    desc:  "Confirma en segundos. Activa notificaciones y recibe recordatorios automáticos.",
  },
];

/* Illustrative agenda preview — product vision, no photo needed */
const PREVIEW_APTS = [
  { time: "10:00", name: "Valentina R.", service: "Manicure Semipermanente", confirmed: true,  isNext: true  },
  { time: "13:30", name: "Sofía M.",     service: "Balayage + Corte",        confirmed: true,  isNext: false },
  { time: "16:00", name: "Camila T.",    service: "Extensiones Clásicas",    confirmed: false, isNext: false },
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
            className="font-display font-normal italic text-[24px] text-on-surface tracking-[-0.01em]"
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
              className="font-ui text-[13px] font-medium bg-on-surface text-surface px-4 md:px-5 py-2.5 rounded-full hover:opacity-85 transition-opacity"
            >
              Para profesionales
            </Link>
          </nav>
        </div>
      </header>

      <main>

        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden pt-16">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20 lg:py-24 relative">
            <div className="grid md:grid-cols-[1fr_340px] lg:grid-cols-[1fr_380px] gap-10 lg:gap-14 items-start">

              {/* ─ Left ────────────────────────────────────────────────── */}
              <div className="max-w-[520px]">

                {/* Eyebrow — brand-toned, not metadata */}
                <p className="musa-sublabel text-on-surface-subtle mb-7">
                  Belleza profesional · Venezuela
                </p>

                {/* Headline — roman upright for weight, light italic for emotion */}
                <h1
                  className="font-display leading-[0.92]"
                  style={{ letterSpacing: "-0.025em", fontSize: "clamp(42px, 6.5vw, 72px)" }}
                >
                  <span className="block text-on-surface font-normal">Tu próxima cita</span>
                  <span className="block text-on-surface font-normal">con la profesional</span>
                  <em
                    className="block font-light italic text-primary"
                    style={{ marginTop: "0.06em" }}
                  >
                    que mereces.
                  </em>
                </h1>

                {/* Signature rule — used once */}
                <div className="my-7 flex flex-col gap-[3px]">
                  <div className="h-px bg-primary opacity-35 w-full" />
                  <div className="h-[0.5px] opacity-40 w-[55%]" style={{ background: "#C4996A" }} />
                </div>

                {/* Subtitle — benefit-first, no negative framing */}
                <p className="font-ui text-[15px] text-on-surface-muted leading-relaxed max-w-[320px]">
                  Las mejores profesionales de belleza,
                  disponibles cuando tú decides.
                </p>

                {/* Search — 56px, rounded-2xl, premium resting shadow */}
                <form onSubmit={handleSearch} className="mt-8">
                  <div
                    className="flex items-center gap-3 h-[56px] px-5 bg-surface-raised border border-border rounded-2xl focus-within:border-border-focus focus-within:shadow-[0_0_0_3px_rgba(181,89,62,0.09),0_2px_8px_rgba(26,14,11,0.05)] transition-all duration-200"
                    style={{ boxShadow: "0 2px 8px rgba(26,14,11,0.06), 0 1px 2px rgba(26,14,11,0.04)" }}
                  >
                    <MagnifyingGlassIcon className="w-[17px] h-[17px] text-on-surface-subtle flex-shrink-0" />
                    <input
                      className="flex-1 bg-transparent outline-none font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle"
                      placeholder="Uñas, cabello, tu ciudad…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      autoComplete="off"
                    />
                    <button
                      type="submit"
                      className="flex-shrink-0 w-[38px] h-[38px] bg-primary rounded-full flex items-center justify-center text-on-primary hover:bg-primary-hover transition-colors shadow-primary-sm"
                      aria-label="Buscar"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </form>

                {/* Category chips — slightly more breathing room between pills */}
                <nav className="mt-4 flex items-center gap-2.5 flex-wrap" aria-label="Categorías">
                  {CATEGORIES.map(({ key, label }) => (
                    <Link key={key} href={`/explore?category=${key}`} className="musa-chip">
                      {label}
                    </Link>
                  ))}
                </nav>
              </div>

              {/* ─ Right: dark editorial panel — live agenda preview ─────── */}
              <div className="hidden md:block self-stretch">
                <div
                  className="relative h-full min-h-[460px] rounded-2xl overflow-hidden flex flex-col justify-between p-7"
                  style={{ background: "#1A0E0B" }}
                >
                  {/* Ghost brand mark */}
                  <span
                    aria-hidden="true"
                    className="absolute -right-6 -top-10 font-display select-none pointer-events-none leading-none font-normal italic"
                    style={{ fontSize: "300px", color: "#C4996A", opacity: 0.055, letterSpacing: "-0.04em" }}
                  >
                    M
                  </span>

                  {/* Panel label */}
                  <p className="musa-sublabel relative z-10" style={{ color: "#5A4035" }}>
                    Tu agenda hoy
                  </p>

                  {/* Appointment cards — first card is visually "active/next" */}
                  <div className="space-y-3 relative z-10">
                    {PREVIEW_APTS.map((apt, i) => (
                      <div
                        key={i}
                        className="rounded-xl px-4 py-3"
                        style={{
                          background: apt.isNext
                            ? "rgba(255,255,255,0.075)"
                            : "rgba(255,255,255,0.035)",
                          borderLeft: `2px solid ${
                            apt.isNext
                              ? "rgba(181,89,62,0.65)"
                              : apt.confirmed
                              ? "rgba(181,89,62,0.28)"
                              : "rgba(139,112,96,0.18)"
                          }`,
                        }}
                      >
                        {/* "Próxima" micro-badge on the active card */}
                        {apt.isNext && (
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div
                              className="w-[5px] h-[5px] rounded-full flex-shrink-0"
                              style={{ background: "#B5593E", opacity: 0.75 }}
                            />
                            <span
                              className="font-ui text-[9px] font-medium uppercase tracking-[0.12em]"
                              style={{ color: "#7A5A50" }}
                            >
                              Próxima
                            </span>
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-ui font-medium text-[13px] leading-tight truncate"
                              style={{ color: apt.isNext ? "#F8F0E8" : "#C4B0A8" }}
                            >
                              {apt.name}
                            </p>
                            <p
                              className="font-ui text-[11px] mt-[3px] truncate"
                              style={{ color: "#5A4035" }}
                            >
                              {apt.service}
                            </p>
                          </div>
                          <span
                            className="font-mono-num text-[12px] flex-shrink-0 pt-0.5"
                            style={{ color: apt.isNext ? "#C4996A" : "#4A3028" }}
                          >
                            {apt.time}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer — signature rule only, no explanatory text */}
                  <div className="relative z-10">
                    <div className="flex flex-col gap-[3px] w-14">
                      <div className="h-px opacity-[0.22]" style={{ background: "#C4996A" }} />
                      <div className="h-[0.5px] w-[55%] opacity-[0.14]" style={{ background: "#C4996A" }} />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Promotions ───────────────────────────────────────────────── */}
        <section className="py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-5 md:px-8">

            {/* Header — editorial chapter rhythm: sublabel = identifier, h2 = topic */}
            <div className="flex items-end justify-between mb-8">
              <div>
                <p className="musa-sublabel text-on-surface-subtle mb-2">
                  Ofertas
                </p>
                <h2
                  className="font-display font-normal italic text-on-surface leading-none"
                  style={{ fontSize: "38px", letterSpacing: "-0.015em" }}
                >
                  Esta semana.
                </h2>
              </div>
              <Link
                href="/explore"
                className="inline-flex items-center gap-1 font-ui text-[13px] font-medium text-on-surface-muted hover:text-on-surface transition-colors self-end"
              >
                Ver todo
                <ArrowRightIcon className="w-3 h-3" />
              </Link>
            </div>

            {/* Loading skeleton */}
            {promoLoading && (
              <div>
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="py-5 border-t border-border-subtle flex items-center gap-5 md:gap-8"
                  >
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
            )}

            {/* Empty state — editorial quality, designed to be the first thing most visitors see */}
            {!promoLoading && promotions.length === 0 && (
              <div className="py-14">
                {/* Centered signature rule — same orientation as hero rule (sub-line left-aligned) */}
                <div className="mx-auto mb-8" style={{ width: "80px" }}>
                  <div className="h-px bg-primary" style={{ opacity: 0.26 }} />
                  <div
                    className="h-[0.5px] mt-[3px]"
                    style={{ width: "55%", background: "#C4996A", opacity: 0.18 }}
                  />
                </div>
                <div className="text-center max-w-xs mx-auto">
                  {/* font-light italic — one weight below the h2 above, reads as absence not statement */}
                  <p
                    className="font-display font-light italic text-on-surface mb-3"
                    style={{ fontSize: "26px", letterSpacing: "-0.01em" }}
                  >
                    Sin ofertas esta semana.
                  </p>
                  <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed mb-8">
                    Cuando una profesional publique un descuento,
                    lo encontrarás aquí.
                  </p>
                  <Link
                    href="/explore"
                    className="inline-flex items-center gap-2 font-ui text-[13px] font-medium px-5 py-2.5 rounded-full border border-border hover:border-primary-border hover:text-primary hover:bg-primary-surface transition-all duration-150"
                  >
                    Ver profesionales
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Promo rows */}
            {!promoLoading && promotions.length > 0 && (
              <div>
                {promotions.map((promo) => (
                  <Link
                    key={promo.id}
                    href={promo.owner ? `/p/${promo.owner.slug}` : "/explore"}
                    className="group block"
                  >
                    <div className="py-5 border-t border-border-subtle flex items-center gap-5 md:gap-8 -mx-3 px-3 rounded-lg hover:bg-surface-tinted/50 transition-colors duration-200">
                      <div className="flex-shrink-0 w-[72px] text-right">
                        <span
                          className="font-display font-normal text-primary"
                          style={{ fontSize: "34px", lineHeight: "1" }}
                        >
                          -{promo.discount}%
                        </span>
                      </div>
                      <div className="hidden sm:block w-px h-9 bg-border-subtle flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-ui font-medium text-[14px] md:text-[15px] text-on-surface mb-0.5 truncate">
                          {promo.title}
                        </p>
                        <p className="font-ui text-[12px] text-on-surface-muted truncate">
                          {promo.owner?.name ?? promo.business.name}
                          {promo.business.city && (
                            <span className="text-on-surface-subtle"> · {promo.business.city}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <span className="font-mono-num text-[11px] text-on-surface-subtle whitespace-nowrap">
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

        {/* ── Segmentation cards ──────────────────────────────────────── */}
        <section className="py-6 md:py-8">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <div className="grid md:grid-cols-2 gap-3 md:gap-4">

              {/* Clienta card — defined border, larger corner frames */}
              <Link href="/client" className="group block">
                <div
                  className="relative overflow-hidden rounded-2xl p-8 md:p-10 transition-all duration-300 hover:shadow-lg"
                  style={{
                    background:  "rgba(237,229,223,0.80)",
                    minHeight:   "300px",
                    border:      "1px solid rgba(181,89,62,0.10)",
                  }}
                >
                  {/* Top-right corner frame — 52px, 30% opacity */}
                  <div
                    className="absolute top-6 right-6 w-[52px] h-[52px] pointer-events-none"
                    style={{
                      borderTop:   "1.5px solid rgba(181,89,62,0.30)",
                      borderRight: "1.5px solid rgba(181,89,62,0.30)",
                    }}
                  />
                  <div className="relative">
                    <p className="musa-sublabel text-on-surface-subtle mb-6">
                      Para clientas
                    </p>
                    <h3
                      className="font-display font-normal italic text-on-surface leading-[1.06]"
                      style={{ fontSize: "clamp(28px, 4vw, 40px)", letterSpacing: "-0.015em" }}
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

              {/* Professional card — ghost M, CTA with outlined pill */}
              <Link href="/login" className="group block">
                <div
                  className="relative overflow-hidden rounded-2xl p-8 md:p-10 transition-all duration-300 hover:shadow-xl"
                  style={{ background: "#1A0E0B", minHeight: "300px" }}
                >
                  {/* Top-right corner frame — gold */}
                  <div
                    className="absolute top-6 right-6 w-[52px] h-[52px] pointer-events-none"
                    style={{
                      borderTop:   "1.5px solid rgba(196,153,106,0.28)",
                      borderRight: "1.5px solid rgba(196,153,106,0.28)",
                    }}
                  />
                  <div className="relative">
                    <p className="musa-sublabel mb-6" style={{ color: "#6B5040" }}>
                      Para profesionales
                    </p>
                    <h3
                      className="font-display font-normal italic leading-[1.06]"
                      style={{
                        fontSize:      "clamp(30px, 4.5vw, 44px)",
                        letterSpacing: "-0.015em",
                        color:         "#F2EBE0",
                      }}
                    >
                      Tu negocio,<br />en otro nivel.
                    </h3>
                    <p
                      className="font-ui text-[14px] mt-4 mb-8 leading-relaxed max-w-[260px]"
                      style={{ color: "#8B7060" }}
                    >
                      Agenda digital, gestión de clientas y estadísticas.
                      Todo lo que tu negocio necesita para crecer.
                    </p>
                    {/* Outlined pill CTA — more presence than text arrow */}
                    <span
                      className="inline-flex items-center gap-2 font-ui text-[13px] font-medium px-4 py-2 rounded-full"
                      style={{
                        border: "1px solid rgba(196,153,106,0.32)",
                        color:  "#C4996A",
                      }}
                    >
                      Empezar gratis
                      <ArrowRightIcon className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-200" />
                    </span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </section>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <section className="py-14 md:py-20">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <div className="border-t border-b border-border-subtle py-12 md:py-14">
              <div className="grid grid-cols-3 divide-x divide-border-subtle">
                {STATS.map(({ value, label }) => (
                  <div key={label} className="text-center px-4 md:px-10">
                    <p
                      className="font-display font-normal text-on-surface leading-none"
                      style={{ fontSize: "clamp(32px, 5.5vw, 60px)", letterSpacing: "-0.03em" }}
                    >
                      {value}
                    </p>
                    <p className="font-ui text-[11px] md:text-[12px] text-on-surface-muted mt-2.5 leading-snug max-w-[90px] mx-auto">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────────── */}
        <section className="py-10 md:py-14">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <p className="musa-sublabel text-on-surface-subtle mb-3">
              Proceso
            </p>
            <h2
              className="font-display font-normal italic text-on-surface mb-12 md:mb-14"
              style={{ fontSize: "36px", letterSpacing: "-0.015em" }}
            >
              Así de simple.
            </h2>

            <div className="grid md:grid-cols-3 gap-10 md:gap-12">
              {STEPS.map(({ n, title, desc }) => (
                <div key={n}>
                  <p className="font-mono-num text-[11px] text-on-surface-subtle mb-4">{n}</p>
                  <h3
                    className="font-display font-normal text-on-surface mb-2.5"
                    style={{ fontSize: "22px", lineHeight: "1.1" }}
                  >
                    {title}
                  </h3>
                  <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Professional CTA ─────────────────────────────────────────── */}
        <section className="pb-14 md:pb-20">
          <div className="max-w-6xl mx-auto px-5 md:px-8">
            <div
              className="relative overflow-hidden rounded-2xl px-8 py-12 md:px-14 md:py-14"
              style={{ background: "#1A0E0B" }}
            >
              {/* Ghost M — dominant, top-right crop */}
              <span
                aria-hidden="true"
                className="absolute -right-10 -top-16 font-display select-none pointer-events-none leading-none font-normal italic"
                style={{ fontSize: "440px", color: "#C4996A", opacity: 0.045, letterSpacing: "-0.04em" }}
              >
                M
              </span>
              <div className="relative max-w-lg">
                <p className="musa-sublabel mb-6" style={{ color: "#6B5040" }}>
                  Para profesionales de belleza
                </p>

                {/* Headline — three-beat anaphora, professional-centered */}
                <h2
                  className="font-display font-normal italic leading-[1.06] mb-5"
                  style={{
                    fontSize:      "clamp(28px, 4.5vw, 46px)",
                    letterSpacing: "-0.015em",
                    color:         "#F2EBE0",
                  }}
                >
                  Tu marca. Tu agenda.
                  <br />Tu negocio.
                </h2>
                <p
                  className="font-ui text-[14px] leading-relaxed mb-8 max-w-[340px]"
                  style={{ color: "#8B7060" }}
                >
                  Agenda digital, perfil público, gestión de clientas,
                  recordatorios automáticos y estadísticas. Todo pensado
                  para el negocio de belleza.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/register"
                    className="font-ui text-[14px] font-medium px-7 py-3 rounded-full bg-primary text-on-primary transition-opacity hover:opacity-90 shadow-primary-sm"
                  >
                    Empezar gratis
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 font-ui text-[14px] font-medium px-4 py-3 transition-opacity hover:opacity-60"
                    style={{ color: "#8B7060" }}
                  >
                    Ya tengo cuenta
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <footer className="border-t border-border-subtle py-8">
          <div className="max-w-6xl mx-auto px-5 md:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <Link
              href="/"
              className="font-display font-normal italic text-[22px] text-on-surface tracking-[-0.01em]"
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
