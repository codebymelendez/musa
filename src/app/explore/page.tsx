"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

interface BusinessCard {
  id: string;
  name: string;
  slug: string;
  category: string | null;
  city: string | null;
  address: string | null;
  staffCount: number;
  owner: {
    name: string;
    slug: string;
    avatarUrl: string | null;
    bio: string | null;
    serviceType: string | null;
    servicesCount: number;
  };
}

const CATEGORIES = [
  { key: "", label: "Todos", emoji: "✨" },
  { key: "nails", label: "Uñas", emoji: "💅" },
  { key: "hair", label: "Cabello", emoji: "💇" },
  { key: "brows", label: "Cejas", emoji: "👁️" },
  { key: "makeup", label: "Maquillaje", emoji: "💄" },
  { key: "other", label: "Otros", emoji: "🌸" },
];

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  nails:  { label: "Uñas",       emoji: "💅", color: "bg-pink-100 text-pink-700" },
  hair:   { label: "Cabello",    emoji: "💇", color: "bg-violet-100 text-violet-700" },
  brows:  { label: "Cejas",      emoji: "✨", color: "bg-amber-100 text-amber-700" },
  makeup: { label: "Maquillaje", emoji: "💄", color: "bg-rose-100 text-rose-700" },
  other:  { label: "Belleza",    emoji: "🌸", color: "bg-purple-100 text-purple-700" },
};

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [city, setCity] = useState(searchParams.get("city") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [businesses, setBusinesses] = useState<BusinessCard[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = useCallback(async (q: string, c: string, cat: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (c) params.set("city", c);
      if (cat) params.set("category", cat);
      const res = await fetch(`/api/public/businesses?${params}`);
      const data = await res.json();
      setBusinesses(data.businesses ?? []);
    } catch {
      setBusinesses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBusinesses(query, city, category);
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchBusinesses(query, city, category);
    // Update URL for shareability
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    if (category) params.set("category", category);
    router.replace(`/explore?${params}`, { scroll: false });
  };

  const handleCategorySelect = (cat: string) => {
    setCategory(cat);
    fetchBusinesses(query, city, cat);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    if (cat) params.set("category", cat);
    router.replace(`/explore?${params}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-background font-body text-on-surface antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg shadow-sm shadow-purple-500/5">
        <div className="px-4 pt-4 pb-3 max-w-2xl mx-auto space-y-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors flex-shrink-0"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
            <h1 className="font-headline text-lg font-bold text-on-surface">
              Explorar profesionales
            </h1>
          </div>

          {/* Search form */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-surface-container-high rounded-xl px-4 py-2.5">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">search</span>
              <input
                className="flex-1 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60"
                placeholder="Nombre o servicio..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button type="button" onClick={() => { setQuery(""); fetchBusinesses("", city, category); }}>
                  <span className="material-symbols-outlined text-on-surface-variant text-sm">close</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-surface-container-high rounded-xl px-3 py-2.5">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">location_on</span>
              <input
                className="w-24 bg-transparent outline-none text-sm text-on-surface placeholder:text-on-surface-variant/60"
                placeholder="Ciudad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="off"
              />
            </div>
          </form>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {CATEGORIES.map(({ key, label, emoji }) => (
              <button
                key={key}
                onClick={() => handleCategorySelect(key)}
                className={`flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                  category === key
                    ? "bg-primary text-white shadow-sm"
                    : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                <span>{emoji}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {/* Results count */}
        {!loading && (
          <p className="text-xs text-on-surface-variant mb-4 font-medium">
            {businesses.length === 0
              ? "No encontramos resultados"
              : `${businesses.length} profesional${businesses.length !== 1 ? "es" : ""} encontrada${businesses.length !== 1 ? "s" : ""}`}
            {city ? ` en ${city}` : ""}
          </p>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-surface-container-high rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <span className="text-5xl">🔍</span>
            <div>
              <h3 className="font-headline font-bold text-on-surface">Sin resultados</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Intenta con otro servicio o ciudad.
              </p>
            </div>
            <button
              onClick={() => {
                setQuery("");
                setCity("");
                setCategory("");
                fetchBusinesses("", "", "");
              }}
              className="text-sm font-bold text-primary hover:underline"
            >
              Ver todos los profesionales
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {businesses.map((biz) => {
              const catMeta =
                CATEGORY_META[biz.category ?? "other"] ?? CATEGORY_META.other;
              return (
                <Link
                  key={biz.id}
                  href={`/p/${biz.owner.slug}`}
                  className="block group"
                >
                  <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 hover:shadow-md hover:border-primary/20 transition-all group-active:scale-[0.99] flex items-start gap-4">
                    {/* Avatar */}
                    <div className="w-16 h-16 rounded-2xl bg-surface-container-high overflow-hidden relative flex-shrink-0">
                      {biz.owner.avatarUrl ? (
                        <Image
                          src={biz.owner.avatarUrl}
                          alt={biz.owner.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">
                          {catMeta.emoji}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-headline font-bold text-on-surface truncate">
                            {biz.name}
                          </h3>
                          <p className="text-xs text-on-surface-variant">
                            {biz.owner.name}
                          </p>
                        </div>
                        <span className={`flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${catMeta.color}`}>
                          {catMeta.label}
                        </span>
                      </div>

                      {biz.owner.bio && (
                        <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
                          {biz.owner.bio}
                        </p>
                      )}

                      <div className="flex items-center gap-3 pt-1">
                        {biz.city && (
                          <span className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">location_on</span>
                            {biz.city}
                          </span>
                        )}
                        {biz.owner.servicesCount > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">content_cut</span>
                            {biz.owner.servicesCount} servicio{biz.owner.servicesCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {biz.staffCount > 1 && (
                          <span className="flex items-center gap-0.5 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">group</span>
                            {biz.staffCount} profesionales
                          </span>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="flex-shrink-0 self-center">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-primary group-hover:text-white text-sm transition-colors">
                          calendar_add_on
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
