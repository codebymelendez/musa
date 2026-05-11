"use client";

import { useState } from "react";
import { BlockType, CreateBlockPayload } from "@/types";
import { XMarkIcon, ExclamationCircleIcon, UserIcon, NoSymbolIcon } from "@heroicons/react/24/outline";

interface ConflictInfo {
  message: string;
  conflicts: Array<{ id: string; startTime: string; endTime: string; client?: { name: string } }>;
}

interface Props {
  defaultDate?: Date;
  onClose: () => void;
  onCreated: () => void;
}

const BLOCK_TYPE_LABELS: Record<BlockType, { label: string; icon: string }> = {
  manual: { label: "Bloqueo puntual", icon: "block" },
  vacation: { label: "Vacaciones / día libre", icon: "beach_access" },
  break: { label: "Descanso / pausa", icon: "coffee" },
};

export default function BlockTimeModal({ defaultDate, onClose, onCreated }: Props) {
  const today = defaultDate ?? new Date();
  const todayStr = today.toISOString().split("T")[0];

  const [blockType, setBlockType] = useState<BlockType>("manual");
  const [isAllDay, setIsAllDay] = useState(false);
  const [dateFrom, setDateFrom] = useState(todayStr);
  const [dateTo, setDateTo] = useState(todayStr);
  const [timeFrom, setTimeFrom] = useState("09:00");
  const [timeTo, setTimeTo] = useState("10:00");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);

  const buildPayload = (force = false): CreateBlockPayload & { force: boolean } => {
    let startTime: string;
    let endTime: string;

    if (isAllDay) {
      startTime = new Date(`${dateFrom}T00:00:00`).toISOString();
      const endDate = new Date(`${dateTo}T23:59:59`);
      endTime = endDate.toISOString();
    } else {
      startTime = new Date(`${dateFrom}T${timeFrom}:00`).toISOString();
      endTime = new Date(`${dateFrom}T${timeTo}:00`).toISOString();
    }

    return { startTime, endTime, isAllDay, reason: reason || undefined, blockType, force };
  };

  const handleSubmit = async (e: React.FormEvent, forceConfirm = false) => {
    e?.preventDefault();
    setSaving(true);
    setError(null);
    setConflict(null);

    try {
      const res = await fetch("/api/availability-blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(forceConfirm)),
      });

      const data = await res.json();

      if (res.status === 409 && data.error === "conflict") {
        setConflict({ message: data.message, conflicts: data.conflicts });
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Error al crear bloqueo");
        return;
      }

      onCreated();
      onClose();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-medium text-on-surface text-lg">Bloquear tiempo</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tipo de bloqueo */}
        <div className="space-y-2">
          <label className="musa-sublabel">
            Tipo
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.entries(BLOCK_TYPE_LABELS) as [BlockType, { label: string; icon: string }][]).map(
              ([type, { label, icon }]) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setBlockType(type)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-medium transition-colors ${
                    blockType === type
                      ? "bg-primary text-white"
                      : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  <div className="w-5 h-5 rounded bg-surface-container-highest" />
                  <span className="text-center leading-tight">{label}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Toggle día completo */}
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            className={`relative w-11 h-6 rounded-full transition-colors ${isAllDay ? "bg-primary" : "bg-surface-container-high"}`}
            onClick={() => setIsAllDay(!isAllDay)}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${isAllDay ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </div>
          <span className="text-sm font-medium text-on-surface">Día(s) completo(s)</span>
        </label>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isAllDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="musa-sublabel">
                  Desde
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    if (e.target.value > dateTo) setDateTo(e.target.value);
                  }}
                  required
                  className="mt-1 w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
                />
              </div>
              <div>
                <label className="musa-sublabel">
                  Hasta
                </label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom}
                  onChange={(e) => setDateTo(e.target.value)}
                  required
                  className="mt-1 w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="musa-sublabel">
                  Fecha
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  required
                  className="mt-1 w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="musa-sublabel">
                    Desde
                  </label>
                  <input
                    type="time"
                    value={timeFrom}
                    onChange={(e) => setTimeFrom(e.target.value)}
                    required
                    className="mt-1 w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
                  />
                </div>
                <div>
                  <label className="musa-sublabel">
                    Hasta
                  </label>
                  <input
                    type="time"
                    value={timeTo}
                    onChange={(e) => setTimeTo(e.target.value)}
                    required
                    className="mt-1 w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Motivo interno */}
          <div>
            <label className="musa-sublabel">
              Motivo interno (opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: Médico, almuerzo con proveedores..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={300}
              className="mt-1 w-full bg-surface-container-high rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none placeholder:text-on-surface-variant/40"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}

          {/* Conflictos detectados */}
          {conflict && (
            <div className="bg-amber-50 rounded-2xl p-4 space-y-3">
              <p className="text-sm font-medium text-amber-800">
                <ExclamationCircleIcon className="w-5 h-5 inline mr-1" />
                {conflict.message}
              </p>
              <ul className="space-y-1">
                {conflict.conflicts.map((c) => (
                  <li key={c.id} className="text-xs text-amber-700 flex items-center gap-1.5">
                    <UserIcon className="w-4 h-4" />
                    {c.client?.name ?? "Clienta"} ·{" "}
                    {new Date(c.startTime).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-amber-700">
                Si continúas, el bloqueo se creará igualmente. Las citas existentes no se cancelan automáticamente.
              </p>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
                className="w-full h-10 bg-amber-500 text-white text-sm font-medium rounded-xl"
              >
                Guardar de todas formas
              </button>
            </div>
          )}

          {!conflict && (
            <button
              type="submit"
              disabled={saving}
              className="w-full h-12 bg-primary text-on-primary shadow-primary-sm font-medium rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <NoSymbolIcon className="w-5 h-5" />
                  Bloquear tiempo
                </>
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
