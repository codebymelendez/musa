"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ScissorsIcon,
  CalendarDaysIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

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
  { key: "",       label: "Todas"       },
  { key: "nails",  label: "Uñas"        },
  { key: "hair",   label: "Cabello"     },
  { key: "brows",  label: "Cejas"       },
  { key: "makeup", label: "Maquillaje"  },
  { key: "other",  label: "Otros"       },
];

export default function ExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const [query,    setQuery]    = useState(searchParams.get("q")        ?? "");
  const [city,     setCity]     = useState(searchParams.get("city")     ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [service,  setService]  = useState(searchParams.get("service")  ?? "");
  const [date,     setDate]     = useState(searchParams.get("date")     ?? "");

  const [businesses,       setBusinesses]       = useState<BusinessCard[]>([]);
  const [loading,          setLoading]          = useState(true);
  const [detectingLocation, setDetectingLocation] = useState(false);

  const isFirstRender = useRef(true);

  const fetchBusinesses = useCallback(
    async (q: string, c: string, cat: string, svc: string, dt: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (q)   params.set("q",        q);
        if (c)   params.set("city",     c);
        if (cat) params.set("category", cat);
        if (svc) params.set("service",  svc);
        if (dt)  params.set("date",     dt);
        const res  = await fetch(`/api/public/businesses?${params}`);
        const data = await res.json();
        setBusinesses(data.businesses ?? []);
      } catch {
        setBusinesses([]);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const delay = isFirstRender.current ? 0 : 350;
    isFirstRender.current = false;
    const timer = setTimeout(() => {
      fetchBusinesses(query, city, category, service, date);

      const params = new URLSearchParams();
      if (query)    params.set("q",        query);
      if (city)     params.set("city",     city);
      if (category) params.set("category", category);
      if (service)  params.set("service",  service);
      if (date)     params.set("date",     date);
      router.replace(`/explore${params.size ? `?${params}` : ""}`, { scroll: false });
    }, delay);
    return () => clearTimeout(timer);
  }, [query, city, category, service, date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Geolocalización automática si no hay ciudad
  useEffect(() => {
    if (searchParams.get("city") || city) return;
    if (!navigator.geolocation) return;
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=es`,
            { headers: { "User-Agent": "Musa/1.0" } },
          );
          const data = await res.json();
          const detected =
            data.address?.city ||
            data.address?.town  ||
            data.address?.municipality ||
            data.address?.village;
          if (detected) setCity(detected);
        } catch { /* reverse geocoding failed */ }
        finally  { setDetectingLocation(false); }
      },
      () => setDetectingLocation(false),
      { timeout: 6000 },
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Chips de filtros activos
  const activeFilters = [
    service  && { label: service,  clear: () => setService("") },
    date     && { label: new Date(date + "T12:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "short" }), clear: () => setDate("") },
  ].filter(Boolean) as { label: string; clear: () => void }[];

  return (
    <div className="min-h-screen bg-background font-ui text-on-surface antialiased flex flex-col">

      {/* ── Header sticky ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle">
        <div className="px-4 pt-4 pb-3 max-w-2xl mx-auto space-y-3">

          {/* Fila superior */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors flex-shrink-0"
              aria-label="Volver"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <h1 className="font-ui font-semibold text-[16px] text-on-surface">Explorar</h1>
            {detectingLocation && (
              <span className="ml-auto flex items-center gap-1.5 font-ui text-[12px] text-on-surface-subtle">
                <MapPinIcon className="w-3.5 h-3.5 animate-pulse" />
                Detectando…
              </span>
            )}
          </div>

          {/* Fila de búsqueda */}
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 bg-surface-raised border border-border rounded-md px-3 py-2.5 focus-within:border-border-focus transition-all">
              <MagnifyingGlassIcon className="w-4 h-4 text-on-surface-subtle flex-shrink-0" />
              <input
                className="flex-1 bg-transparent outline-none font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle"
                placeholder="Servicio, nombre…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-on-surface-subtle hover:text-on-surface transition-colors" aria-label="Limpiar">
                  <XMarkIcon className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-surface-raised border border-border rounded-md px-3 py-2.5 focus-within:border-border-focus transition-all min-w-0">
              <MapPinIcon className="w-4 h-4 text-on-surface-subtle flex-shrink-0" />
              <input
                className="w-20 bg-transparent outline-none font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle"
                placeholder="Ciudad"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                autoComplete="off"
              />
              {city && (
                <button type="button" onClick={() => setCity("")} className="text-on-surface-subtle hover:text-on-surface transition-colors" aria-label="Limpiar ciudad">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Pills de categoría */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 hide-scrollbar">
            {CATEGORIES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setCategory(key)}
                className={cn(
                  "flex-shrink-0 font-ui text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all duration-150",
                  category === key
                    ? "bg-primary text-on-primary border-primary shadow-primary-sm"
                    : "bg-transparent text-on-surface-muted border-border hover:border-primary/50 hover:text-on-surface",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Chips de filtros activos (servicio / fecha) */}
          {activeFilters.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {activeFilters.map((f) => (
                <button
                  key={f.label}
                  type="button"
                  onClick={f.clear}
                  className="flex items-center gap-1.5 font-ui text-[11px] font-medium px-2.5 py-1 bg-primary-surface border border-primary-border text-primary rounded-full hover:bg-primary hover:text-on-primary transition-all"
                >
                  {f.label}
                  <XMarkIcon className="w-3 h-3" />
                </button>
              ))}
              {activeFilters.length > 1 && (
                <button
                  type="button"
                  onClick={() => { setService(""); setDate(""); }}
                  className="font-ui text-[11px] text-on-surface-muted hover:text-on-surface transition-colors"
                >
                  Limpiar todo
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Resultados ───────────────────────────────────────────────── */}
      <main className="flex-1 px-4 py-4 max-w-2xl mx-auto w-full">
        {!loading && (
          <p className="font-ui text-[12px] text-on-surface-subtle mb-4">
            {businesses.length === 0
              ? "Sin resultados"
              : `${businesses.length} profesional${businesses.length !== 1 ? "es" : ""}`}
            {city ? ` en ${city}` : ""}
            {service ? ` · ${service}` : ""}
          </p>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <MagnifyingGlassIcon className="w-10 h-10 text-on-surface-subtle mx-auto" />
            <div>
              <p className="font-ui font-semibold text-[15px] text-on-surface">Sin resultados</p>
              <p className="font-ui text-[13px] text-on-surface-muted mt-1">
                Intenta con otro servicio o ciudad.
              </p>
            </div>
            <button
              onClick={() => { setQuery(""); setCity(""); setCategory(""); setService(""); setDate(""); }}
              className="font-ui text-[13px] font-semibold text-primary hover:underline underline-offset-2"
            >
              Ver todos los profesionales
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {businesses.map((biz) => (
              <Link key={biz.id} href={`/p/${biz.slug}`} className="block group">
                <div className="bg-surface-raised border border-border-subtle rounded-xl p-4 shadow-xs hover:shadow-md hover:border-primary-border transition-all duration-[160ms] group-active:scale-[0.99] flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-14 h-14 rounded-xl bg-rose-50 overflow-hidden relative flex-shrink-0">
                    {biz.owner.avatarUrl ? (
                      <Image
                        src={biz.owner.avatarUrl}
                        alt={biz.owner.name}
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ScissorsIcon className="w-5 h-5 text-sienna-300" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-ui font-semibold text-[15px] text-on-surface truncate leading-tight">
                          {biz.name}
                        </h3>
                        <p className="font-ui text-[12px] text-on-surface-muted">{biz.owner.name}</p>
                      </div>
                      {biz.owner.serviceType && (
                        <span className="flex-shrink-0 font-ui text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-sunken text-on-surface-muted capitalize">
                          {biz.owner.serviceType}
                        </span>
                      )}
                    </div>

                    {biz.owner.bio && (
                      <p className="font-ui text-[12px] text-on-surface-muted leading-relaxed line-clamp-1">
                        {biz.owner.bio}
                      </p>
                    )}

                    <div className="flex items-center gap-3">
                      {biz.city && (
                        <span className="flex items-center gap-1 font-ui text-[11px] text-on-surface-subtle">
                          <MapPinIcon className="w-3 h-3" />
                          {biz.city}
                        </span>
                      )}
                      {biz.owner.servicesCount > 0 && (
                        <span className="flex items-center gap-1 font-ui text-[11px] text-on-surface-subtle">
                          <ScissorsIcon className="w-3 h-3" />
                          {biz.owner.servicesCount} servicio{biz.owner.servicesCount !== 1 ? "s" : ""}
                        </span>
                      )}
                      {biz.staffCount > 1 && (
                        <span className="flex items-center gap-1 font-ui text-[11px] text-on-surface-subtle">
                          <UserGroupIcon className="w-3 h-3" />
                          {biz.staffCount}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="flex-shrink-0 self-center">
                    <div className="w-9 h-9 rounded-full bg-primary-surface border border-primary-border flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-[160ms]">
                      <CalendarDaysIcon className="w-4 h-4 text-primary group-hover:text-on-primary transition-colors" />
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="py-8 text-center">
        <p className="font-ui text-[11px] text-on-surface-subtle/50">
          Musa ·{" "}
          <a
            href="https://codebymelendez.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-on-surface-subtle transition-colors"
          >
            codebymelendez.com
          </a>
        </p>
      </footer>
    </div>
  );
}
