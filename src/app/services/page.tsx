"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PlusIcon,
  ScissorsIcon,
  ClockIcon,
  PencilIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { useServices } from "@/hooks/useServices";
import { Service, ServiceCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";
import ServiceModal from "@/components/services/ServiceModal";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  nails:  "Uñas",
  hair:   "Cabello",
  brows:  "Cejas & Pestañas",
  makeup: "Maquillaje",
  other:  "Otro",
};

const CATEGORY_BORDER: Record<ServiceCategory, string> = {
  nails:  "border-l-primary",
  hair:   "border-l-sienna-500",
  brows:  "border-l-success",
  makeup: "border-l-warning",
  other:  "border-l-border",
};

const CATEGORY_TEXT: Record<ServiceCategory, string> = {
  nails:  "text-primary",
  hair:   "text-sienna-500",
  brows:  "text-success",
  makeup: "text-warning",
  other:  "text-on-surface-muted",
};

const FILTER_CHIPS = [
  { key: "all",    label: "Todos"     },
  { key: "hair",   label: "Cabello"   },
  { key: "nails",  label: "Uñas"      },
  { key: "brows",  label: "Cejas"     },
  { key: "makeup", label: "Maquillaje"},
];

export default function Services() {
  const { services, loading, fetchServices, deleteService } = useServices();
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<Service | null>(null);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const filtered =
    activeFilter === "all"
      ? services
      : services.filter((s) => s.category === activeFilter);

  const handleEdit = (service: Service) => { setEditTarget(service); setModalOpen(true); };
  const handleNew  = () => { setEditTarget(null); setModalOpen(true); };
  const handleModalClose = () => { setModalOpen(false); setEditTarget(null); fetchServices(); };

  return (
    <main className="pt-24 px-5 max-w-5xl mx-auto pb-32 animate-page">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="font-ui text-[11px] font-semibold tracking-widest text-primary uppercase mb-1 block">
            Menú
          </span>
          <h1 className="font-display text-[32px] font-semibold text-on-surface tracking-[-0.02em] italic">
            Servicios
          </h1>
          <p className="font-ui text-[14px] text-on-surface-muted mt-1">
            {services.length} servicio{services.length !== 1 ? "s" : ""} en tu menú
          </p>
        </div>
        <button
          onClick={handleNew}
          className="hidden md:flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-ui font-semibold text-[14px] shadow-primary-sm hover:bg-primary-hover transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo Servicio
        </button>
      </div>

      {/* ── Category filter ─────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-5 hide-scrollbar">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActiveFilter(chip.key)}
            className={`flex-shrink-0 font-ui text-[12px] font-medium px-4 py-1.5 rounded-full border transition-all duration-150 ${
              activeFilter === chip.key
                ? "bg-primary text-on-primary border-primary shadow-primary-sm"
                : "bg-transparent text-on-surface-muted border-border hover:border-primary/50 hover:text-on-surface"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-on-surface-muted">
          <SparklesIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-ui font-semibold text-[15px] text-on-surface">
            No hay servicios{activeFilter !== "all" ? " en esta categoría" : ""}
          </p>
          <button
            onClick={handleNew}
            className="mt-4 font-ui text-[13px] font-semibold text-primary hover:underline underline-offset-2"
          >
            Agregar servicio
          </button>
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((service) => {
            const borderColor = CATEGORY_BORDER[service.category] ?? "border-l-border";
            const textColor   = CATEGORY_TEXT[service.category]   ?? "text-on-surface-muted";
            return (
              <div
                key={service.id}
                className={`group relative bg-surface-raised border border-border-subtle border-l-[3px] ${borderColor} rounded-xl shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col`}
              >
                {service.imageUrl && (
                  <div className="relative w-full h-32 overflow-hidden">
                    <Image
                      src={service.imageUrl}
                      alt={service.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col">
                  <div className="absolute top-0 right-0 p-3 z-10">
                    <button
                      onClick={() => handleEdit(service)}
                      className={`p-2 rounded-full transition-colors hover:bg-primary/5 ${
                        service.imageUrl ? "bg-white/90 shadow-sm text-stone-700" : "text-on-surface-subtle hover:text-primary"
                      }`}
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <span className={`font-ui text-[11px] font-semibold uppercase tracking-widest mb-1 block ${textColor}`}>
                      {CATEGORY_LABELS[service.category]}
                    </span>
                    <h3 className="font-ui font-semibold text-[17px] text-on-surface group-hover:text-primary transition-colors pr-8 leading-tight">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="font-ui text-[12px] text-on-surface-muted mt-1 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1.5 font-ui text-[13px] text-on-surface-muted">
                      <ClockIcon className="w-3.5 h-3.5" />
                      {service.durationMin} min
                    </div>
                    <div className="bg-surface-sunken px-3 py-1.5 rounded-lg">
                      <span className="font-ui font-semibold text-[16px] text-on-surface">
                        {formatCurrency(service.price, service.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add new card */}
          <div
            onClick={handleNew}
            className="group border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center text-center hover:border-primary/50 hover:bg-primary/[0.02] transition-colors cursor-pointer"
          >
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
              <PlusIcon className="w-5 h-5" />
            </div>
            <span className="font-ui font-semibold text-[14px] text-on-surface">
              Nuevo Servicio
            </span>
            <p className="font-ui text-[12px] text-on-surface-muted mt-1">
              Agrega al menú
            </p>
          </div>
        </div>
      )}

      {/* ── FAB mobile ──────────────────────────────────────────────── */}
      <button
        onClick={handleNew}
        className="md:hidden fixed bottom-28 right-5 w-14 h-14 rounded-full bg-primary text-on-primary shadow-primary-md flex items-center justify-center active:scale-90 transition-transform z-50 hover:bg-primary-hover musa-fab"
        aria-label="Nuevo servicio"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {modalOpen && <ServiceModal service={editTarget} onClose={handleModalClose} />}
    </main>
  );
}
