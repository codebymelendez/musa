"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface PublicPromotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: string;
  business: { name: string; category: string | null; city: string | null };
  owner: { name: string; slug: string; avatarUrl: string | null; serviceType: string | null } | null;
}

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  nails:  { label: "Uñas",        emoji: "💅", color: "bg-pink-100 text-pink-700" },
  hair:   { label: "Cabello",     emoji: "💇", color: "bg-violet-100 text-violet-700" },
  brows:  { label: "Cejas",       emoji: "✨", color: "bg-amber-100 text-amber-700" },
  makeup: { label: "Maquillaje",  emoji: "💄", color: "bg-rose-100 text-rose-700" },
  other:  { label: "Belleza",     emoji: "🌸", color: "bg-purple-100 text-purple-700" },
};

export default function HomePage() {
  const router = useRouter();
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);
  const [promoLoading, setPromoLoading] = useState(true);
  const [search, setSearch] = useState("");

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
    <div className="bg-background font-body text-on-surface antialiased min-h-screen">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-lg px-6 py-3 flex items-center justify-between shadow-sm shadow-purple-500/5">
        <span className="font-headline text-xl font-extrabold text-primary tracking-tight">
          musa ✨
        </span>
        <div className="flex items-center gap-2">
          <Link
            href="/client"
            className="text-xs font-bold text-on-surface-variant hover:text-primary transition-colors px-3 py-2"
          >
            Mis citas
          </Link>
          <Link
            href="/login"
            className="text-xs font-bold bg-surface-container px-4 py-2 rounded-full hover:bg-primary/10 transition-colors"
          >
            Profesionales →
          </Link>
        </div>
      </header>

      <main className="pt-16">
        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-container to-purple-300 px-6 pt-14 pb-20">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

          <div className="relative max-w-lg mx-auto space-y-5">
            <div className="space-y-2">
              <p className="text-white/70 text-sm font-bold uppercase tracking-widest">
                Belleza a tu medida
              </p>
              <h1 className="font-headline text-4xl font-extrabold text-white leading-tight tracking-tighter">
                Descubre y reserva<br />los mejores servicios
              </h1>
              <p className="text-white/80 text-base leading-relaxed">
                Encuentra profesionales cerca de ti, ve sus promociones y agenda en segundos.
              </p>
            </div>

            {/* Search bar */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white rounded-2xl px-4 py-3 shadow-lg shadow-black/10">
                <span className="material-symbols-outlined text-on-surface-variant text-xl">search</span>
                <input
                  className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60 font-medium"
                  placeholder="Uñas, cabello, maquillaje..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-lg shadow-black/10 hover:bg-purple-50 transition-colors flex-shrink-0"
              >
                <span className="material-symbols-outlined text-primary">arrow_forward</span>
              </button>
            </form>
          </div>
        </section>

        {/* ── Categorías rápidas ─────────────────────────────────────────────── */}
        <section className="px-6 pt-6 pb-2 max-w-2xl mx-auto">
          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
            {Object.entries(CATEGORY_META).map(([key, { label, emoji, color }]) => (
              <Link
                key={key}
                href={`/explore?category=${key}`}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold ${color} hover:scale-105 transition-transform`}
              >
                <span>{emoji}</span>
                {label}
              </Link>
            ))}
          </div>
        </section>

        {/* ── Promociones activas ────────────────────────────────────────────── */}
        <section className="px-6 py-6 max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-xl font-extrabold tracking-tight text-on-surface">
              Ofertas de esta semana
            </h2>
            <Link href="/explore" className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5">
              Ver todo
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </Link>
          </div>

          {promoLoading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-surface-container-high rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant">local_offer</span>
              <p className="text-sm text-on-surface-variant">
                No hay promociones activas ahora mismo.
              </p>
              <Link href="/explore" className="text-sm font-bold text-primary hover:underline">
                Explorar profesionales →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {promotions.map((promo) => {
                const catMeta = CATEGORY_META[promo.business.category ?? "other"] ?? CATEGORY_META.other;
                return (
                  <Link
                    key={promo.id}
                    href={promo.owner ? `/p/${promo.owner.slug}` : "/explore"}
                    className="block group"
                  >
                    <div className="flex items-center gap-4 bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/10 hover:shadow-md hover:border-primary/20 transition-all group-active:scale-[0.98]">
                      {/* Avatar */}
                      <div className="w-14 h-14 rounded-2xl bg-surface-container-high overflow-hidden relative flex-shrink-0">
                        {promo.owner?.avatarUrl ? (
                          <Image
                            src={promo.owner.avatarUrl}
                            alt={promo.owner.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl">{catMeta.emoji}</span>
                          </div>
                        )}
                        {/* Discount badge */}
                        <div className="absolute -top-1.5 -right-1.5 bg-primary text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shadow">
                          -{promo.discount}%
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <p className="font-bold text-on-surface text-sm leading-tight truncate">
                          {promo.title}
                        </p>
                        <p className="text-xs text-on-surface-variant truncate">
                          {promo.owner?.name ?? promo.business.name}
                          {promo.business.city ? ` · ${promo.business.city}` : ""}
                        </p>
                        <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                      </div>

                      {/* Arrow */}
                      <span className="material-symbols-outlined text-on-surface-variant group-hover:text-primary transition-colors flex-shrink-0">
                        chevron_right
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Dual CTA ──────────────────────────────────────────────────────── */}
        <section className="px-6 py-6 max-w-2xl mx-auto">
          <h2 className="font-headline text-xl font-extrabold tracking-tight text-on-surface mb-4">
            ¿Cómo podemos ayudarte?
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {/* Clientas */}
            <Link href="/client" className="block group">
              <div className="bg-gradient-to-br from-primary-fixed/40 to-secondary-fixed/30 rounded-2xl p-5 space-y-3 hover:shadow-md transition-all group-active:scale-[0.97] h-full">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">
                  💅
                </div>
                <div>
                  <p className="font-headline font-extrabold text-on-surface text-base leading-tight">
                    Soy clienta
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Reserva citas y gestiona tus visitas
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                  Entrar
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </Link>

            {/* Explorar */}
            <Link href="/explore" className="block group">
              <div className="bg-gradient-to-br from-tertiary-fixed/40 to-primary-fixed/20 rounded-2xl p-5 space-y-3 hover:shadow-md transition-all group-active:scale-[0.97] h-full">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl">
                  🔍
                </div>
                <div>
                  <p className="font-headline font-extrabold text-on-surface text-base leading-tight">
                    Explorar
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    Encuentra el profesional ideal cerca de ti
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-primary">
                  Descubrir
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* ── Cómo funciona ─────────────────────────────────────────────────── */}
        <section className="px-6 py-6 pb-10 max-w-2xl mx-auto">
          <h2 className="font-headline text-xl font-extrabold tracking-tight text-on-surface mb-5">
            ¿Cómo funciona?
          </h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                icon: "search",
                title: "Encuentra tu profesional",
                desc: "Busca por servicio, ubicación o nombre del negocio.",
              },
              {
                step: "2",
                icon: "calendar_add_on",
                title: "Elige fecha y hora",
                desc: "Selecciona el horario que mejor se adapte a ti.",
              },
              {
                step: "3",
                icon: "notifications_active",
                title: "Recibe confirmación",
                desc: "Activa notificaciones y recibe recordatorios de tu cita.",
              },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-primary text-lg">{icon}</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm">{title}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer para profesionales ─────────────────────────────────────── */}
        <footer className="bg-surface-container-lowest border-t border-outline-variant/20 px-6 py-8 text-center space-y-3">
          <p className="text-sm font-bold text-on-surface">¿Eres profesional de belleza?</p>
          <p className="text-xs text-on-surface-variant">
            Gestiona tu agenda, fideliza clientas y haz crecer tu negocio con Musa.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-on-surface text-surface text-sm font-bold px-6 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            <span className="material-symbols-outlined text-sm">store</span>
            Gestiona tu negocio →
          </Link>
          <p className="text-xs text-on-surface-variant pt-2">
            © 2025 Musa · Desarrollado por{" "}
            <a
              href="https://codebymelendez.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-primary transition-colors"
            >
              codebymelendez.com
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
