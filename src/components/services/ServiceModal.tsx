"use client";

import { useState } from "react";
import { Service, ServiceCategory } from "@/types";
import { useServices } from "@/hooks/useServices";

interface Props {
  service: Service | null; // null = crear nuevo
  onClose: () => void;
}

const CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "nails", label: "Uñas" },
  { value: "hair", label: "Cabello" },
  { value: "brows", label: "Cejas & Pestañas" },
  { value: "makeup", label: "Maquillaje" },
  { value: "other", label: "Otro" },
];

export default function ServiceModal({ service, onClose }: Props) {
  const { createService, updateService, deleteService } = useServices();

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [category, setCategory] = useState<ServiceCategory>(
    service?.category ?? "nails"
  );
  const [durationMin, setDurationMin] = useState(
    service?.durationMin?.toString() ?? "60"
  );
  const [price, setPrice] = useState(service?.price?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      setError("Precio inválido");
      return;
    }
    const durationNum = parseInt(durationMin);
    if (isNaN(durationNum) || durationNum <= 0) {
      setError("Duración inválida");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        category,
        durationMin: durationNum,
        price: priceNum,
        currency: "USD",
      };

      if (service) {
        await updateService(service.id, payload);
      } else {
        await createService(payload);
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!service) return;
    if (!confirm(`¿Eliminar "${service.name}"?`)) return;
    setLoading(true);
    try {
      await deleteService(service.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-end sm:items-center justify-center">
      <div className="bg-surface-container-lowest w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl p-8 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-2xl font-bold">
            {service ? "Editar Servicio" : "Nuevo Servicio"}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {error && (
          <div className="p-3 bg-error-container rounded-xl text-on-error-container text-sm">
            {error}
          </div>
        )}

        {/* Nombre */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
            Nombre *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Manicura básica"
            className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/50"
          />
        </div>

        {/* Descripción */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción opcional del servicio..."
            rows={2}
            className="w-full px-4 py-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/50 resize-none text-sm"
          />
        </div>

        {/* Categoría */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
            Categoría
          </label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setCategory(value)}
                className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors ${
                  category === value
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Duración y Precio */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
              Duración (min)
            </label>
            <input
              type="number"
              value={durationMin}
              onChange={(e) => setDurationMin(e.target.value)}
              min="5"
              max="480"
              step="5"
              className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
              Precio ($)
            </label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.50"
              placeholder="0.00"
              className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>

        {/* Acciones */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <span className="material-symbols-outlined animate-spin">
                progress_activity
              </span>
            ) : (
              <>
                <span className="material-symbols-outlined">save</span>
                {service ? "Guardar cambios" : "Crear servicio"}
              </>
            )}
          </button>

          {service && (
            <button
              onClick={handleDelete}
              disabled={loading}
              className="w-full h-12 border border-error/30 text-error font-semibold rounded-full hover:bg-error/5 transition-colors text-sm"
            >
              Eliminar servicio
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
