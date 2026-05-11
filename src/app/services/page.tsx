"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  PlusIcon,
  ClockIcon,
  PencilIcon,
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

/* Left-border accent — same color vocabulary as appointment status dots */
const CATEGORY_BORDER: Record<ServiceCategory, string> = {
  nails:  "border-l-primary",
  hair:   "border-l-secondary",
  brows:  "border-l-success",
  makeup: "border-l-warning",
  other:  "border-l-border",
};

const FILTER_CHIPS = [
  { key: "all",    label: "Todos"      },
  { key: "nails",  label: "Uñas"       },
  { key: "hair",   label: "Cabello"    },
  { key: "brows",  label: "Cejas"      },
  { key: "makeup", label: "Maquillaje" },
];

export default function ServicesPage() {
  const { services, loading, fetchServices } = useServices();
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editTarget,   setEditTarget]   = useState<Service | null>(null);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const filtered = activeFilter === "all"
    ? services
    : services.filter((s) => s.category === activeFilter);

  const handleEdit       = (s: Service) => { setEditTarget(s); setModalOpen(true); };
  const handleNew        = () => { setEditTarget(null); setModalOpen(true); };
  const handleModalClose = () => { setModalOpen(false); setEditTarget(null); fetchServices(); };

  return (
    <main className="pt-24 px-5 max-w-5xl mx-auto pb-32 animate-page">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 px-1">
        <div>
          <span className="musa-sublabel mb-1.5 block">Menú</span>
          <h1 className="font-display font-normal text-[28px] text-on-surface leading-tight">
            {services.length > 0
              ? `${services.length} servicio${services.length !== 1 ? "s" : ""}`
              : "Servicios"}
          </h1>
        </div>
        <button
          onClick={handleNew}
          className="hidden md:flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-ui font-medium text-[14px] shadow-primary-sm hover:bg-primary-hover transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Nuevo servicio
        </button>
      </div>

      {/* ── Category filter ─────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-5 hide-scrollbar px-1">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActiveFilter(chip.key)}
            className={`musa-chip${activeFilter === chip.key ? " musa-chip-active" : ""}`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* ── Loading skeletons ────────────────────────────────────────── */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-xs">
              <div className="space-y-2.5">
                <div className="w-14 h-[10px] rounded bg-surface-sunken animate-pulse" />
                <div
                  className="h-[15px] rounded bg-surface-sunken animate-pulse"
                  style={{ width: `${48 + (i * 17) % 36}%` }}
                />
                <div className="h-[11px] rounded bg-surface-sunken animate-pulse w-[70%]" />
              </div>
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-border-subtle">
                <div className="w-14 h-[11px] rounded bg-surface-sunken animate-pulse" />
                <div className="w-16 h-[16px] rounded bg-surface-sunken animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loading && filtered.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center px-1">
          <div className="musa-rule w-[60px] mb-8" />
          <p
            className="font-display font-light italic text-on-surface mb-2"
            style={{ fontSize: "26px" }}
          >
            {activeFilter !== "all"
              ? "Sin servicios aquí."
              : "Tu menú está vacío."}
          </p>
          <p className="font-ui text-[13px] text-on-surface-muted max-w-[240px] mb-8">
            {activeFilter !== "all"
              ? "Prueba otro filtro o agrega un servicio en esta categoría."
              : "Agrega tu primer servicio para empezar a recibir reservas."}
          </p>
          <button
            onClick={handleNew}
            className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-2.5 rounded-full font-ui font-medium text-[13px] hover:bg-primary-surface transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            {activeFilter !== "all" ? "Agregar servicio" : "Crear primer servicio"}
          </button>
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
          {filtered.map((service) => {
            const border = CATEGORY_BORDER[service.category] ?? "border-l-border";
            return (
              <div
                key={service.id}
                className={`bg-surface-raised border border-border-subtle border-l-2 ${border} rounded-xl shadow-xs hover:shadow-md hover:-translate-y-px transition-all duration-200 flex flex-col overflow-hidden`}
              >
                {/* Cover image — only when present */}
                {service.imageUrl && (
                  <div className="relative w-full h-[110px] overflow-hidden">
                    <Image
                      src={service.imageUrl}
                      alt={service.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col">
                  {/* Category + name + optional description */}
                  <div className="mb-4">
                    <span className="musa-sublabel mb-1.5 block">
                      {CATEGORY_LABELS[service.category]}
                    </span>
                    <h3 className="font-ui font-medium text-[15px] text-on-surface leading-snug">
                      {service.name}
                    </h3>
                    {service.description && (
                      <p className="font-ui text-[12px] text-on-surface-muted mt-1 line-clamp-2 leading-relaxed">
                        {service.description}
                      </p>
                    )}
                  </div>

                  {/* Footer: duration · price · edit */}
                  <div className="mt-auto pt-4 border-t border-border-subtle">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-on-surface-subtle">
                        <ClockIcon className="w-3.5 h-3.5" />
                        <span className="font-mono-num text-[12px]">{service.durationMin}</span>
                        <span className="font-ui text-[12px]">min</span>
                      </span>
                      <span className="font-mono-num text-[17px] text-on-surface">
                        {formatCurrency(service.price, service.currency)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleEdit(service)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 h-8 font-ui text-[12px] font-medium text-on-surface-subtle hover:text-primary hover:bg-primary-surface rounded-lg transition-colors"
                    >
                      <PencilIcon className="w-3.5 h-3.5" />
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
