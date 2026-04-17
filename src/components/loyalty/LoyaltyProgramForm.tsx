"use client";

import { useState, useEffect } from "react";
import { LoyaltyProgram } from "@/types";

interface Props {
  program: LoyaltyProgram | null;
  onSaved: (program: LoyaltyProgram) => void;
}

export default function LoyaltyProgramForm({ program, onSaved }: Props) {
  const [form, setForm] = useState({
    name: "Programa de Fidelización",
    isActive: true,
    accumulationType: "visits" as "visits" | "points",
    pointsPerVisit: 1,
    rewardThreshold: 10,
    rewardDescription: "",
    validUntil: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (program) {
      setForm({
        name: program.name,
        isActive: program.isActive,
        accumulationType: program.accumulationType,
        pointsPerVisit: program.pointsPerVisit,
        rewardThreshold: program.rewardThreshold,
        rewardDescription: program.rewardDescription,
        validUntil: program.validUntil ? program.validUntil.split("T")[0] : "",
      });
    }
  }, [program]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/loyalty/program", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          validUntil: form.validUntil || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al guardar");
        return;
      }
      onSaved(data.program);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const thresholdLabel = form.accumulationType === "visits"
    ? `Cada ${form.rewardThreshold} visita${form.rewardThreshold !== 1 ? "s" : ""}`
    : `Al llegar a ${form.rewardThreshold} punto${form.rewardThreshold !== 1 ? "s" : ""}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre del programa */}
      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Nombre del programa
        </label>
        <input
          className="mt-1 w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
          placeholder="Ej: Club VIP, Sello de lealtad..."
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          required
        />
      </div>

      {/* Activo */}
      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className={`relative w-11 h-6 rounded-full transition-colors ${form.isActive ? "bg-primary" : "bg-surface-container-high"}`}
          onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`}
          />
        </div>
        <span className="text-sm font-medium text-on-surface">
          {form.isActive ? "Programa activo" : "Programa desactivado"}
        </span>
      </label>

      {/* Tipo de acumulación */}
      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Tipo de acumulación
        </label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["visits", "points"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setForm((f) => ({ ...f, accumulationType: type }))}
              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-bold transition-colors ${
                form.accumulationType === type
                  ? "bg-primary text-white"
                  : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {type === "visits" ? "event" : "stars"}
              </span>
              {type === "visits" ? "Por visitas" : "Por puntos"}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs text-on-surface-variant">
          {form.accumulationType === "visits"
            ? "Cada cita completada suma 1 visita."
            : "Cada cita completada suma puntos según el valor configurado."}
        </p>
      </div>

      {/* Puntos por visita (solo si accumulationType = points) */}
      {form.accumulationType === "points" && (
        <div>
          <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
            Puntos por visita
          </label>
          <input
            type="number"
            min={1}
            max={100}
            value={form.pointsPerVisit}
            onChange={(e) => setForm((f) => ({ ...f, pointsPerVisit: Number(e.target.value) }))}
            className="mt-1 w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
          />
        </div>
      )}

      {/* Umbral de recompensa */}
      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Umbral para recompensa
        </label>
        <input
          type="number"
          min={1}
          max={1000}
          value={form.rewardThreshold}
          onChange={(e) => setForm((f) => ({ ...f, rewardThreshold: Number(e.target.value) }))}
          className="mt-1 w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
        />
        <p className="mt-1 text-xs text-on-surface-variant font-medium">{thresholdLabel} → recompensa</p>
      </div>

      {/* Descripción de la recompensa */}
      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Descripción de la recompensa
        </label>
        <textarea
          placeholder="Ej: 1 manicure completa gratis, 30% de descuento en tu próximo servicio..."
          rows={2}
          value={form.rewardDescription}
          onChange={(e) => setForm((f) => ({ ...f, rewardDescription: e.target.value }))}
          required
          className="mt-1 w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none resize-none placeholder:text-on-surface-variant/40"
        />
      </div>

      {/* Vigencia (opcional) */}
      <div>
        <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
          Vigencia del programa (opcional)
        </label>
        <input
          type="date"
          value={form.validUntil}
          onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
          className="mt-1 w-full bg-surface-container-high rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary-container border-none outline-none"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2">{error}</p>
      )}
      {success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-xl px-4 py-2">
          Programa guardado correctamente
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="w-full h-12 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? (
          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
        ) : (
          "Guardar programa"
        )}
      </button>
    </form>
  );
}
