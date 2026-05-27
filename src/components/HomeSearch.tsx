"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  CalendarDaysIcon,
  XMarkIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

const VENEZUELA_CITIES = [
  "Caracas", "Maracaibo", "Valencia", "Barquisimeto",
  "Maracay", "Barcelona", "Maturín", "San Cristóbal",
];

const CATEGORY_CHIPS = [
  { key: "nails",  label: "Uñas"       },
  { key: "hair",   label: "Cabello"    },
  { key: "brows",  label: "Cejas"      },
  { key: "lashes", label: "Pestañas"   },
  { key: "makeup", label: "Maquillaje" },
  { key: "other",  label: "Spa & Más"  },
];

interface ServiceCategory {
  key: string;
  label: string;
  services: string[];
}

type Panel = "service" | "location" | "date" | null;

export default function HomeSearch() {
  const router = useRouter();

  // Valores seleccionados
  const [service, setService] = useState("");   // nombre del servicio
  const [city,    setCity]    = useState("");
  const [date,    setDate]    = useState("");   // YYYY-MM-DD

  // UI state
  const [activePanel, setActivePanel]       = useState<Panel>(null);
  const [categories,  setCategories]        = useState<ServiceCategory[]>([]);
  const [serviceSearch, setServiceSearch]   = useState("");
  const [cityInput,   setCityInput]         = useState("");
  const [detectingLoc, setDetectingLoc]     = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  const containerRef  = useRef<HTMLDivElement>(null);
  const serviceInputRef = useRef<HTMLInputElement>(null);
  const cityInputRef    = useRef<HTMLInputElement>(null);

  // Cargar servicios desde la API
  useEffect(() => {
    if (categoriesLoaded) return;
    fetch("/api/public/services")
      .then((r) => r.json())
      .then((d) => { setCategories(d.categories ?? []); setCategoriesLoaded(true); })
      .catch(() => {});
  }, [categoriesLoaded]);

  // Cerrar panel al hacer clic fuera
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActivePanel(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Autofocar input al abrir panel
  useEffect(() => {
    if (activePanel === "service") {
      setTimeout(() => serviceInputRef.current?.focus(), 60);
    } else if (activePanel === "location") {
      setTimeout(() => cityInputRef.current?.focus(), 60);
    }
  }, [activePanel]);

  // Detectar geolocalización
  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setDetectingLoc(true);
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
            data.address?.municipality;
          if (detected) {
            setCity(detected);
            setCityInput(detected);
            setActivePanel(null);
          }
        } catch { /* error silencioso */ }
        finally   { setDetectingLoc(false); }
      },
      () => setDetectingLoc(false),
      { timeout: 6000 },
    );
  }, []);

  const openPanel = (p: Panel) => setActivePanel((prev) => (prev === p ? null : p));

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (service) params.set("service", service);
    if (city)    params.set("city", city);
    if (date)    params.set("date", date);
    router.push(`/explore${params.size ? `?${params}` : ""}`);
  };

  const clearService = (e: React.MouseEvent) => { e.stopPropagation(); setService(""); };
  const clearCity    = (e: React.MouseEvent) => { e.stopPropagation(); setCity(""); setCityInput(""); };
  const clearDate    = (e: React.MouseEvent) => { e.stopPropagation(); setDate(""); };

  // Filtro en el combobox de servicios
  const filtered = categories
    .map((cat) => ({
      ...cat,
      services: cat.services.filter(
        (s) => !serviceSearch || s.toLowerCase().includes(serviceSearch.toLowerCase()),
      ),
    }))
    .filter((cat) => cat.services.length > 0);

  // Etiquetas amigables
  const dateLabel = date
    ? new Date(date + "T12:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "short" })
    : "Cualquier día";

  return (
    <div ref={containerRef} className="relative mt-8">

      {/* ── Barra principal ─────────────────────────────────────────────── */}
      <div
        className="flex items-stretch bg-surface-raised border border-border rounded-2xl overflow-visible"
        style={{ boxShadow: "0 4px 16px rgba(26,14,11,0.08), 0 1px 3px rgba(26,14,11,0.04)", minHeight: "56px" }}
      >

        {/* — Filtro 1: Tratamiento — */}
        <button
          type="button"
          onClick={() => openPanel("service")}
          className="flex-1 flex items-center gap-2 px-4 py-3 text-left min-w-0 hover:bg-surface-sunken/40 transition-colors rounded-l-2xl"
        >
          <MagnifyingGlassIcon className="w-4 h-4 text-on-surface-subtle flex-shrink-0" />
          <span className={cn(
            "font-ui text-[13px] truncate",
            service ? "text-on-surface font-medium" : "text-on-surface-muted",
          )}>
            {service || "Todos los tratamientos"}
          </span>
          {service && (
            <button
              type="button"
              onClick={clearService}
              className="flex-shrink-0 ml-auto text-on-surface-subtle hover:text-on-surface transition-colors"
              aria-label="Limpiar servicio"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </button>

        {/* Divisor */}
        <span className="w-px bg-border-subtle self-stretch flex-shrink-0" />

        {/* — Filtro 2: Ubicación — */}
        <button
          type="button"
          onClick={() => openPanel("location")}
          className="flex items-center gap-2 px-3 py-3 hover:bg-surface-sunken/40 transition-colors whitespace-nowrap"
        >
          <MapPinIcon className="w-4 h-4 text-on-surface-subtle flex-shrink-0" />
          <span className={cn(
            "font-ui text-[13px]",
            city ? "text-on-surface font-medium" : "text-on-surface-muted",
          )}>
            {city || "Ubicación"}
          </span>
          {city && (
            <button type="button" onClick={clearCity} className="text-on-surface-subtle hover:text-on-surface transition-colors" aria-label="Limpiar ciudad">
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </button>

        {/* Divisor */}
        <span className="w-px bg-border-subtle self-stretch flex-shrink-0" />

        {/* — Filtro 3: Fecha — */}
        <button
          type="button"
          onClick={() => openPanel("date")}
          className="hidden sm:flex items-center gap-2 px-3 py-3 hover:bg-surface-sunken/40 transition-colors whitespace-nowrap"
        >
          <CalendarDaysIcon className="w-4 h-4 text-on-surface-subtle flex-shrink-0" />
          <span className={cn(
            "font-ui text-[13px]",
            date ? "text-on-surface font-medium" : "text-on-surface-muted",
          )}>
            {dateLabel}
          </span>
          {date && (
            <button type="button" onClick={clearDate} className="text-on-surface-subtle hover:text-on-surface transition-colors" aria-label="Limpiar fecha">
              <XMarkIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </button>

        {/* — Botón buscar — */}
        <button
          type="button"
          onClick={handleSearch}
          className="flex-shrink-0 m-2 w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary hover:bg-primary-hover transition-colors shadow-primary-sm"
          aria-label="Buscar profesionales"
        >
          <MagnifyingGlassIcon className="w-[17px] h-[17px]" />
        </button>
      </div>

      {/* ── Panel: Tratamiento ──────────────────────────────────────────── */}
      {activePanel === "service" && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-surface-raised border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
          {/* Buscador */}
          <div className="p-3 border-b border-border-subtle">
            <div className="flex items-center gap-2 bg-surface-sunken rounded-xl px-3 py-2">
              <MagnifyingGlassIcon className="w-4 h-4 text-on-surface-subtle flex-shrink-0" />
              <input
                ref={serviceInputRef}
                className="flex-1 bg-transparent outline-none font-ui text-[13px] text-on-surface placeholder:text-on-surface-subtle"
                placeholder="Buscar servicio..."
                value={serviceSearch}
                onChange={(e) => setServiceSearch(e.target.value)}
              />
              {serviceSearch && (
                <button type="button" onClick={() => setServiceSearch("")} className="text-on-surface-subtle hover:text-on-surface">
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* "Todos" */}
          <button
            type="button"
            onClick={() => { setService(""); setServiceSearch(""); setActivePanel(null); }}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-sunken/50 transition-colors",
              !service && "bg-primary-surface/40",
            )}
          >
            <span className="font-ui text-[14px] text-on-surface">Todos los tratamientos</span>
            {!service && <CheckIcon className="w-4 h-4 text-primary ml-auto" />}
          </button>

          {/* Categorías + servicios */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length > 0 ? (
              filtered.map((cat) => (
                <div key={cat.key}>
                  <div className="px-4 py-1 bg-surface-sunken/50">
                    <span className="font-ui text-[10px] font-semibold uppercase tracking-[0.1em] text-on-surface-subtle">
                      {cat.label}
                    </span>
                  </div>
                  {cat.services.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => { setService(name); setServiceSearch(""); setActivePanel(null); }}
                      className={cn(
                        "w-full flex items-center gap-3 pl-6 pr-4 py-2.5 text-left hover:bg-surface-sunken/50 transition-colors",
                        service === name ? "text-primary font-medium" : "text-on-surface",
                      )}
                    >
                      <span className="font-ui text-[13px] flex-1">{name}</span>
                      {service === name && <CheckIcon className="w-3.5 h-3.5 text-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <p className="px-4 py-6 text-center font-ui text-[13px] text-on-surface-muted">
                Sin resultados para &ldquo;{serviceSearch}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Panel: Ubicación ─────────────────────────────────────────────── */}
      {activePanel === "location" && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 sm:left-auto sm:w-72 bg-surface-raised border border-border rounded-2xl shadow-xl z-50 p-4 space-y-3">
          {/* Usar ubicación actual */}
          <button
            type="button"
            onClick={detectLocation}
            disabled={detectingLoc}
            className="w-full flex items-center gap-2.5 px-4 py-3 bg-primary-surface/60 border border-primary-border rounded-xl hover:bg-primary-surface transition-colors disabled:opacity-60"
          >
            <MapPinIcon className={cn("w-4 h-4 text-primary", detectingLoc && "animate-pulse")} />
            <span className="font-ui text-[13px] font-medium text-on-surface">
              {detectingLoc ? "Detectando ubicación…" : "Usar mi ubicación actual"}
            </span>
          </button>

          {/* Input manual */}
          <div className="flex items-center gap-2 bg-surface-sunken rounded-xl px-3 py-2.5 border border-border focus-within:border-border-focus transition-all">
            <input
              ref={cityInputRef}
              className="flex-1 bg-transparent outline-none font-ui text-[13px] text-on-surface placeholder:text-on-surface-subtle"
              placeholder="Escribe una ciudad…"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && cityInput.trim()) {
                  setCity(cityInput.trim());
                  setActivePanel(null);
                }
              }}
            />
            {cityInput && (
              <button
                type="button"
                onClick={() => { setCity(cityInput.trim()); setActivePanel(null); }}
                className="font-ui text-[12px] font-medium text-primary"
              >
                OK
              </button>
            )}
          </div>

          {/* Ciudades sugeridas */}
          <div>
            <p className="font-ui text-[10px] font-semibold uppercase tracking-[0.1em] text-on-surface-subtle mb-2">
              Ciudades principales
            </p>
            <div className="flex flex-wrap gap-1.5">
              {VENEZUELA_CITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCity(c); setCityInput(c); setActivePanel(null); }}
                  className={cn(
                    "font-ui text-[12px] px-2.5 py-1 rounded-full border transition-colors",
                    city === c
                      ? "bg-primary text-on-primary border-primary"
                      : "border-border text-on-surface-muted hover:border-primary-border hover:text-on-surface",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {city && (
            <button
              type="button"
              onClick={() => { setCity(""); setCityInput(""); setActivePanel(null); }}
              className="w-full font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors py-1"
            >
              Mostrar todas las ciudades
            </button>
          )}
        </div>
      )}

      {/* ── Panel: Fecha ──────────────────────────────────────────────────── */}
      {activePanel === "date" && (
        <div className="absolute top-[calc(100%+8px)] right-0 bg-surface-raised border border-border rounded-2xl shadow-xl z-50 p-4 w-64 space-y-3">
          <p className="font-ui text-[12px] font-medium text-on-surface">
            Selecciona una fecha
          </p>
          <input
            type="date"
            className="w-full h-10 px-3 bg-surface-sunken border border-border rounded-xl font-ui text-[14px] text-on-surface outline-none focus:border-border-focus transition-all"
            value={date}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => { setDate(e.target.value); setActivePanel(null); }}
          />
          {date && (
            <button
              type="button"
              onClick={() => { setDate(""); setActivePanel(null); }}
              className="w-full font-ui text-[12px] text-on-surface-muted hover:text-on-surface transition-colors py-1"
            >
              Ver cualquier día
            </button>
          )}
        </div>
      )}

      {/* ── Chips de categoría (acceso rápido) ─────────────────────────── */}
      <nav className="mt-4 flex items-center gap-2 flex-wrap" aria-label="Categorías rápidas">
        {CATEGORY_CHIPS.map(({ key, label }) => (
          <Link key={key} href={`/explore?category=${key}`} className="musa-chip">
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
