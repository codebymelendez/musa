"use client";

import { useState } from "react";
import { XMarkIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Service, ServiceCategory } from "@/types";
import { useServices } from "@/hooks/useServices";
import ImageUploader from "@/components/ui/ImageUploader";

interface Props {
  service: Service | null;
  onClose: () => void;
}

const CATEGORIES: { value: ServiceCategory; label: string }[] = [
  { value: "nails",  label: "Uñas"          },
  { value: "hair",   label: "Cabello"        },
  { value: "brows",  label: "Cejas"          },
  { value: "makeup", label: "Maquillaje"     },
  { value: "other",  label: "Otro"           },
];

export default function ServiceModal({ service, onClose }: Props) {
  const { createService, updateService, deleteService } = useServices();

  const [name,        setName]        = useState(service?.name        ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [imageUrl,    setImageUrl]    = useState(service?.imageUrl    ?? "");
  const [category,    setCategory]    = useState<ServiceCategory>(service?.category ?? "nails");
  const [durationMin, setDurationMin] = useState(service?.durationMin?.toString() ?? "60");
  const [price,       setPrice]       = useState(service?.price?.toString()       ?? "");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    const priceNum    = parseFloat(price);
    const durationNum = parseInt(durationMin);
    if (isNaN(priceNum)    || priceNum    <  0) { setError("Precio inválido");   return; }
    if (isNaN(durationNum) || durationNum <= 0) { setError("Duración inválida"); return; }

    setError(null);
    setLoading(true);
    try {
      const payload = {
        name:        name.trim(),
        description: description.trim() || undefined,
        imageUrl:    imageUrl           || undefined,
        category,
        durationMin: durationNum,
        price:       priceNum,
        currency:    "USD",
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
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-espresso-900/55"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-background/96 backdrop-blur-sm z-10 flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border-subtle">
          <div className="flex-1 min-w-0">
            <p className="musa-sublabel mb-0.5">
              {service ? "Editar servicio" : "Nuevo servicio"}
            </p>
            <h2 className="font-display font-normal text-[20px] text-on-surface leading-tight truncate">
              {service ? service.name : "Servicio"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors flex-shrink-0"
            aria-label="Cerrar"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ── Form ────────────────────────────────────────────────── */}
        <div className="px-6 pt-5 pb-10 space-y-5">

          {/* Error */}
          {error && (
            <div className="bg-error-surface rounded-xl px-4 py-3 font-ui text-[13px] text-error">
              {error}
            </div>
          )}

          {/* Imagen */}
          <div>
            <span className="musa-sublabel block mb-2">Foto del servicio</span>
            <ImageUploader
              currentUrl={imageUrl || null}
              bucket="service-images"
              storagePath={`service/${service?.id ?? "new"}/cover`}
              onUploaded={(url) => setImageUrl(url)}
              shape="rounded"
              hint="JPG, PNG o WebP · Opcional"
            />
          </div>

          {/* Nombre */}
          <div>
            <span className="musa-sublabel block mb-2">Nombre *</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Manicura semipermanente"
              className="musa-input"
            />
          </div>

          {/* Descripción */}
          <div>
            <span className="musa-sublabel block mb-2">Descripción</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción opcional del servicio…"
              rows={3}
              className="w-full px-4 py-3 bg-surface-raised border border-border rounded-xl font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(181,89,62,0.12)] transition-all duration-150 resize-none"
            />
          </div>

          {/* Categoría */}
          <div>
            <span className="musa-sublabel block mb-3">Categoría</span>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCategory(value)}
                  className={`musa-chip${category === value ? " musa-chip-active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Duración + Precio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="musa-sublabel block mb-2">Duración (min)</span>
              <input
                type="number"
                value={durationMin}
                onChange={(e) => setDurationMin(e.target.value)}
                min="5"
                max="480"
                step="5"
                className="musa-input"
              />
            </div>
            <div>
              <span className="musa-sublabel block mb-2">Precio ($)</span>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.50"
                placeholder="0.00"
                className="musa-input"
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleSave}
              disabled={loading}
              className="w-full h-[50px] bg-primary text-on-primary rounded-full font-ui font-medium text-[15px] shadow-primary-sm hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                service ? "Guardar cambios" : "Crear servicio"
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full h-[44px] font-ui font-medium text-[13px] text-on-surface-muted hover:text-on-surface transition-colors"
            >
              Cancelar
            </button>

            {service && (
              <button
                onClick={handleDelete}
                disabled={loading}
                className="w-full h-[44px] border border-error-surface text-error font-ui font-medium text-[13px] rounded-full hover:bg-error-surface transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <TrashIcon className="w-4 h-4" />
                Eliminar servicio
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
