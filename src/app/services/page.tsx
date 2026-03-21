"use client";

import { useEffect, useState } from "react";
import { useServices } from "@/hooks/useServices";
import { Service, ServiceCategory } from "@/types";
import { formatCurrency } from "@/lib/utils";
import ServiceModal from "@/components/services/ServiceModal";

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  nails: "Uñas",
  hair: "Cabello",
  brows: "Cejas & Pestañas",
  makeup: "Maquillaje",
  other: "Otro",
};

const CATEGORY_COLORS: Record<ServiceCategory, string> = {
  nails: "secondary",
  hair: "primary",
  brows: "tertiary",
  makeup: "tertiary",
  other: "outline",
};

const FILTER_CHIPS = [
  { key: "all", label: "Todos" },
  { key: "hair", label: "Cabello" },
  { key: "nails", label: "Uñas" },
  { key: "brows", label: "Cejas" },
  { key: "makeup", label: "Maquillaje" },
];

export default function Services() {
  const { services, loading, fetchServices, deleteService } = useServices();
  const [activeFilter, setActiveFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Service | null>(null);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filtered =
    activeFilter === "all"
      ? services
      : services.filter((s) => s.category === activeFilter);

  const handleEdit = (service: Service) => {
    setEditTarget(service);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditTarget(null);
    fetchServices();
  };

  return (
    <main className="pt-24 px-6 max-w-5xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="font-headline text-sm font-semibold tracking-wider text-primary uppercase mb-1 block">
            Gestión
          </span>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Servicios
          </h2>
          <p className="text-on-surface-variant mt-1">
            {services.length} servicio{services.length !== 1 ? "s" : ""} en tu menú
          </p>
        </div>
        <button
          onClick={handleNew}
          className="hidden md:flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <span className="material-symbols-outlined">add</span>
          Nuevo Servicio
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.key}
            onClick={() => setActiveFilter(chip.key)}
            className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              activeFilter === chip.key
                ? "bg-primary text-on-primary"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary animate-spin text-3xl">
            progress_activity
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">spa</span>
          <p className="font-semibold">No hay servicios{activeFilter !== "all" ? " en esta categoría" : ""}</p>
          <button
            onClick={handleNew}
            className="mt-4 text-primary font-semibold text-sm hover:underline"
          >
            Agregar servicio
          </button>
        </div>
      )}

      {/* Bento Grid */}
      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((service) => {
            const color = CATEGORY_COLORS[service.category] ?? "primary";
            return (
              <div
                key={service.id}
                className={`group relative bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-${color} overflow-hidden`}
              >
                <div className="absolute top-0 right-0 p-4">
                  <button
                    onClick={() => handleEdit(service)}
                    className="text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5"
                  >
                    <span className="material-symbols-outlined text-xl">edit</span>
                  </button>
                </div>
                <div className="mb-4">
                  <span className={`text-xs font-bold text-${color} uppercase tracking-widest mb-1 block`}>
                    {CATEGORY_LABELS[service.category]}
                  </span>
                  <h3 className="font-headline text-xl font-bold text-on-surface group-hover:text-primary transition-colors pr-8">
                    {service.name}
                  </h3>
                  {service.description && (
                    <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                      {service.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-1.5 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">schedule</span>
                    <span className="text-sm font-medium">{service.durationMin} min</span>
                  </div>
                  <div className="bg-surface-container-low px-4 py-2 rounded-lg">
                    <span className="text-lg font-extrabold text-on-surface">
                      {formatCurrency(service.price, service.currency)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add new card */}
          <div
            onClick={handleNew}
            className="group border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
              <span className="material-symbols-outlined">add</span>
            </div>
            <span className="font-headline font-semibold text-on-surface">
              Nuevo Servicio
            </span>
            <p className="text-xs text-on-surface-variant mt-1">
              Agrega al menú
            </p>
          </div>
        </div>
      )}

      {/* FAB Mobile */}
      <button
        onClick={handleNew}
        className="md:hidden fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform z-50"
      >
        <span className="material-symbols-outlined">add</span>
      </button>

      {/* Modal */}
      {modalOpen && (
        <ServiceModal
          service={editTarget}
          onClose={handleModalClose}
        />
      )}
    </main>
  );
}
