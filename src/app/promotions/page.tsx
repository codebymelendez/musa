"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  validFrom: string;
  validUntil: string;
  targetUserId: string | null;
  isActive: boolean;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  discount: 10,
  validFrom: new Date().toISOString().split("T")[0],
  validUntil: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  isActive: true,
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [broadcasting, setBroadcasting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPromotions = useCallback(async () => {
    try {
      const res = await fetch("/api/promotions", { credentials: "include" });
      const data = await res.json();
      setPromotions(data.promotions ?? []);
    } catch {
      setError("Error al cargar promociones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const url = editingId ? `/api/promotions/${editingId}` : "/api/promotions";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          discount: Number(form.discount),
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: new Date(form.validUntil + "T23:59:59").toISOString(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al guardar");
        return;
      }

      showToast(editingId ? "Promoción actualizada ✓" : "Promoción creada ✓");
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      fetchPromotions();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta promoción?")) return;
    try {
      await fetch(`/api/promotions/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      showToast("Promoción eliminada");
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Error al eliminar");
    }
  };

  const handleBroadcast = async (promo: Promotion) => {
    setBroadcasting(promo.id);
    try {
      const res = await fetch("/api/promotions/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ promotionId: promo.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Error al enviar");
        return;
      }
      showToast("Push enviada a tus clientas ✓");
    } catch {
      setError("Error al enviar push");
    } finally {
      setBroadcasting(null);
    }
  };

  const startEdit = (promo: Promotion) => {
    setForm({
      title: promo.title,
      description: promo.description,
      discount: promo.discount,
      validFrom: promo.validFrom.split("T")[0],
      validUntil: promo.validUntil.split("T")[0],
      isActive: promo.isActive,
    });
    setEditingId(promo.id);
    setShowForm(true);
  };

  const isActive = (promo: Promotion) => {
    const now = Date.now();
    return (
      promo.isActive &&
      new Date(promo.validFrom).getTime() <= now &&
      new Date(promo.validUntil).getTime() >= now
    );
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg px-6 py-4 flex items-center gap-3 shadow-sm shadow-purple-500/5">
        <Link
          href="/home"
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-purple-50 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="font-headline text-lg font-bold text-on-surface">Promociones</h1>
          <p className="text-xs text-on-surface-variant">{promotions.length} promociones creadas</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setForm(EMPTY_FORM);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 bg-primary text-white text-sm font-bold px-4 py-2 rounded-full shadow-sm shadow-primary/20"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          Nueva
        </button>
      </header>

      <main className="px-6 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">error</span>
            {error}
            <button onClick={() => setError(null)} className="ml-auto">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        )}

        {/* Form de creación/edición */}
        {showForm && (
          <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm space-y-5 border border-outline-variant/20">
            <div className="flex items-center justify-between">
              <h2 className="font-headline font-bold text-on-surface">
                {editingId ? "Editar Promoción" : "Nueva Promoción"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setForm(EMPTY_FORM);
                }}
                className="text-on-surface-variant"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                placeholder="Título (ej: 20% off en pedicure)"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <textarea
                className="w-full bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50 resize-none"
                placeholder="Descripción de la oferta..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Descuento %
                  </label>
                  <input
                    className="w-full mt-1 bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container"
                    type="number"
                    min={1}
                    max={100}
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Desde
                  </label>
                  <input
                    className="w-full mt-1 bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container"
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Hasta
                  </label>
                  <input
                    className="w-full mt-1 bg-surface-container-high border-none rounded-xl py-3 px-4 text-sm focus:ring-2 focus:ring-primary-container"
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    form.isActive ? "bg-primary border-primary" : "border-outline-variant"
                  }`}
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                >
                  {form.isActive && (
                    <span className="material-symbols-outlined text-white text-xs">check</span>
                  )}
                </div>
                <span className="text-sm text-on-surface">Promo activa (visible en la página pública)</span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-12 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : (
                  editingId ? "Guardar cambios" : "Crear promoción"
                )}
              </button>
            </form>
          </div>
        )}

        {/* Lista de promociones */}
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-primary animate-spin text-3xl">progress_activity</span>
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <span
              className="material-symbols-outlined text-5xl text-on-surface-variant"
              style={{ fontVariationSettings: "'FILL' 0" }}
            >
              local_offer
            </span>
            <div>
              <h3 className="font-headline font-bold text-on-surface">Sin promociones aún</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Crea tu primera promo para atraer clientas y fidelizarlas.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {promotions.map((promo) => {
              const active = isActive(promo);
              return (
                <div
                  key={promo.id}
                  className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/20 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            active
                              ? "bg-green-100 text-green-700"
                              : "bg-surface-container-high text-on-surface-variant"
                          }`}
                        >
                          {active ? "Activa" : "Inactiva"}
                        </span>
                        <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full">
                          {promo.discount}% OFF
                        </span>
                      </div>
                      <h3 className="font-headline font-bold text-on-surface truncate">{promo.title}</h3>
                      <p className="text-sm text-on-surface-variant line-clamp-2">{promo.description}</p>
                      <p className="text-xs text-on-surface-variant">
                        {new Date(promo.validFrom).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
                        {" → "}
                        {new Date(promo.validUntil).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Broadcast push */}
                    <button
                      onClick={() => handleBroadcast(promo)}
                      disabled={!!broadcasting}
                      className="flex-1 h-10 bg-primary/10 text-primary text-sm font-bold rounded-xl flex items-center justify-center gap-1.5 hover:bg-primary/20 transition-colors disabled:opacity-50"
                    >
                      {broadcasting === promo.id ? (
                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                          send
                        </span>
                      )}
                      Enviar push
                    </button>

                    <button
                      onClick={() => startEdit(promo)}
                      className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>

                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-100 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-on-surface text-surface text-sm font-bold px-6 py-3 rounded-full shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
