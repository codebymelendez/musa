"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  TagIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

interface Promotion {
  id:           string;
  title:        string;
  description:  string;
  discount:     number;
  validFrom:    string;
  validUntil:   string;
  targetUserId: string | null;
  isActive:     boolean;
}

const EMPTY_FORM = {
  title:       "",
  description: "",
  discount:    10,
  validFrom:   new Date().toISOString().split("T")[0],
  validUntil:  new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  isActive:    true,
};

export default function PromotionsPage() {
  const { toast } = useToast();
  const [promotions,   setPromotions]   = useState<Promotion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [broadcasting, setBroadcasting] = useState<string | null>(null);
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  const fetchPromotions = useCallback(async () => {
    try {
      const res  = await fetch("/api/promotions", { credentials: "include" });
      const data = await res.json();
      setPromotions(data.promotions ?? []);
    } catch {
      setError("Error al cargar promociones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPromotions(); }, [fetchPromotions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url    = editingId ? `/api/promotions/${editingId}` : "/api/promotions";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...form,
          discount:   Number(form.discount),
          validFrom:  new Date(form.validFrom).toISOString(),
          validUntil: new Date(form.validUntil + "T23:59:59").toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al guardar"); return; }
      toast(editingId ? "Promoción actualizada" : "Promoción creada", "success");
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
      await fetch(`/api/promotions/${id}`, { method: "DELETE", credentials: "include" });
      toast("Promoción eliminada", "info");
      setPromotions((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setError("Error al eliminar");
    }
  };

  const handleBroadcast = async (promo: Promotion) => {
    setBroadcasting(promo.id);
    try {
      const res = await fetch("/api/promotions/broadcast", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ promotionId: promo.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Error al enviar"); return; }
      toast("Push enviada a tus clientas", "success");
    } catch {
      setError("Error al enviar push");
    } finally {
      setBroadcasting(null);
    }
  };

  const startEdit = (promo: Promotion) => {
    setForm({
      title:       promo.title,
      description: promo.description,
      discount:    promo.discount,
      validFrom:   promo.validFrom.split("T")[0],
      validUntil:  promo.validUntil.split("T")[0],
      isActive:    promo.isActive,
    });
    setEditingId(promo.id);
    setShowForm(true);
  };

  const isActive = (promo: Promotion) => {
    const now = Date.now();
    return promo.isActive && new Date(promo.validFrom).getTime() <= now && new Date(promo.validUntil).getTime() >= now;
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle px-5 py-3 flex items-center gap-3">
        <Link
          href="/home"
          className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
          aria-label="Volver"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="font-ui font-semibold text-[16px] text-on-surface">Promociones</h1>
          <p className="font-ui text-[11px] text-on-surface-muted">
            {promotions.length} promocion{promotions.length !== 1 ? "es" : ""} creada{promotions.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-primary text-on-primary font-ui text-[13px] font-semibold px-4 py-2 rounded-full shadow-primary-sm hover:bg-primary-hover transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Nueva
        </button>
      </header>

      <main className="px-5 pt-6 max-w-2xl mx-auto space-y-5">
        {/* Error banner */}
        {error && (
          <div className="bg-error-surface border border-error/20 rounded-xl px-4 py-3 flex items-center gap-2">
            <ExclamationCircleIcon className="w-4 h-4 text-error shrink-0" />
            <p className="font-ui text-[13px] text-error flex-1">{error}</p>
            <button onClick={() => setError(null)}>
              <XMarkIcon className="w-4 h-4 text-error" />
            </button>
          </div>
        )}

        {/* Create / edit form */}
        {showForm && (
          <div className="bg-surface-raised border border-border-subtle rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-ui font-semibold text-[16px] text-on-surface">
                {editingId ? "Editar Promoción" : "Nueva Promoción"}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY_FORM); }}
                className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-on-surface-muted hover:text-on-surface transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                className="w-full bg-surface-sunken border border-border rounded-lg py-2.5 px-4 font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle outline-none focus:border-border-focus transition-colors"
                placeholder="Título (ej: 20% off en pedicure)"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                required
              />
              <textarea
                className="w-full bg-surface-sunken border border-border rounded-lg py-2.5 px-4 font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle outline-none focus:border-border-focus transition-colors resize-none"
                placeholder="Descripción de la oferta..."
                rows={2}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                required
              />

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Descuento %", type: "number", value: form.discount, key: "discount" as const, min: 1, max: 100 },
                  { label: "Desde",       type: "date",   value: form.validFrom,  key: "validFrom"  as const },
                  { label: "Hasta",       type: "date",   value: form.validUntil, key: "validUntil" as const },
                ].map(({ label, type, value, key, ...rest }) => (
                  <div key={key}>
                    <label className="font-ui text-[11px] font-semibold text-on-surface-muted uppercase tracking-wider">
                      {label}
                    </label>
                    <input
                      className="w-full mt-1 bg-surface-sunken border border-border rounded-lg py-2.5 px-3 font-ui text-[13px] text-on-surface outline-none focus:border-border-focus transition-colors"
                      type={type}
                      value={String(value)}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: type === "number" ? Number(e.target.value) : e.target.value }))}
                      required
                      {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
                    />
                  </div>
                ))}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                  className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                    form.isActive ? "bg-primary border-primary" : "border-border"
                  }`}
                >
                  {form.isActive && <CheckIcon className="w-3 h-3 text-on-primary" />}
                </button>
                <span className="font-ui text-[13px] text-on-surface">
                  Promo activa (visible en la página pública)
                </span>
              </label>

              <button
                type="submit"
                disabled={saving}
                className="w-full h-11 bg-primary text-on-primary font-ui font-semibold text-[14px] rounded-full flex items-center justify-center gap-2 shadow-primary-sm hover:bg-primary-hover transition-all disabled:opacity-60"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  editingId ? "Guardar cambios" : "Crear promoción"
                )}
              </button>
            </form>
          </div>
        )}

        {/* Promotions list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <TagIcon className="w-10 h-10 text-on-surface-subtle mx-auto opacity-40" />
            <div>
              <h3 className="font-ui font-semibold text-[15px] text-on-surface">Sin promociones aún</h3>
              <p className="font-ui text-[13px] text-on-surface-muted mt-1">
                Crea tu primera promo para atraer clientas y fidelizarlas.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {promotions.map((promo) => {
              const active = isActive(promo);
              return (
                <div
                  key={promo.id}
                  className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-xs space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-ui text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            active
                              ? "bg-success-surface text-success"
                              : "bg-surface-sunken text-on-surface-muted"
                          }`}
                        >
                          {active ? "Activa" : "Inactiva"}
                        </span>
                        <span className="font-ui text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {promo.discount}% OFF
                        </span>
                      </div>
                      <h3 className="font-ui font-semibold text-[15px] text-on-surface truncate">{promo.title}</h3>
                      <p className="font-ui text-[13px] text-on-surface-muted line-clamp-2">{promo.description}</p>
                      <p className="font-ui text-[11px] text-on-surface-subtle">
                        {new Date(promo.validFrom).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
                        {" → "}
                        {new Date(promo.validUntil).toLocaleDateString("es-VE", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBroadcast(promo)}
                      disabled={!!broadcasting}
                      className="flex-1 h-10 bg-primary/8 text-primary font-ui text-[13px] font-semibold rounded-lg flex items-center justify-center gap-1.5 hover:bg-primary/15 transition-colors disabled:opacity-50"
                    >
                      {broadcasting === promo.id ? (
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <PaperAirplaneIcon className="w-4 h-4" />
                      )}
                      Enviar push
                    </button>

                    <button
                      onClick={() => startEdit(promo)}
                      className="w-10 h-10 rounded-lg bg-surface-sunken flex items-center justify-center text-on-surface-muted hover:bg-surface-raised hover:text-on-surface transition-colors border border-border-subtle"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(promo.id)}
                      className="w-10 h-10 rounded-lg bg-error-surface flex items-center justify-center text-error hover:bg-error/20 transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

    </div>
  );
}
