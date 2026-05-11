"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeftIcon,
  PlusIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckIcon,
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

type PromoStatus = "active" | "scheduled" | "ended" | "inactive";
type Filter      = "all" | "active" | "scheduled" | "ended";

function getPromoStatus(promo: Promotion): PromoStatus {
  if (!promo.isActive) return "inactive";
  const now   = Date.now();
  const from  = new Date(promo.validFrom).getTime();
  const until = new Date(promo.validUntil).getTime();
  if (now < from)  return "scheduled";
  if (now > until) return "ended";
  return "active";
}

const STATUS_LABEL: Record<PromoStatus, string> = {
  active:    "Activa",
  scheduled: "Programada",
  ended:     "Finalizada",
  inactive:  "Inactiva",
};

const STATUS_TAG: Record<PromoStatus, string> = {
  active:    "musa-tag musa-tag--success",
  scheduled: "musa-tag musa-tag--gold",
  ended:     "musa-tag musa-tag--neutral",
  inactive:  "musa-tag musa-tag--neutral",
};

const STATUS_BORDER: Record<PromoStatus, string> = {
  active:    "border-l-success",
  scheduled: "border-l-warning",
  ended:     "border-l-border",
  inactive:  "border-l-border",
};

const FILTER_CHIPS: { key: Filter; label: string }[] = [
  { key: "all",       label: "Todas"       },
  { key: "active",    label: "Activas"     },
  { key: "scheduled", label: "Programadas" },
  { key: "ended",     label: "Finalizadas" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-VE", {
    day:   "numeric",
    month: "short",
    year:  "numeric",
  });
}

export default function PromotionsPage() {
  const { toast } = useToast();

  const [promotions,   setPromotions]   = useState<Promotion[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState<Filter>("all");
  const [showModal,    setShowModal]    = useState(false);
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

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const openNew = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (promo: Promotion) => {
    setForm({
      title:       promo.title,
      description: promo.description,
      discount:    promo.discount,
      validFrom:   promo.validFrom.split("T")[0],
      validUntil:  promo.validUntil.split("T")[0],
      isActive:    promo.isActive,
    });
    setEditingId(promo.id);
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const url    = editingId ? `/api/promotions/${editingId}` : "/api/promotions";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers:     { "Content-Type": "application/json" },
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
      toast(editingId ? "Oferta actualizada" : "Oferta creada", "success");
      closeModal();
      fetchPromotions();
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar esta oferta?")) return;
    try {
      await fetch(`/api/promotions/${id}`, { method: "DELETE", credentials: "include" });
      toast("Oferta eliminada", "info");
      setPromotions((prev) => prev.filter((p) => p.id !== id));
      if (editingId === id) closeModal();
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

  const filtered = filter === "all"
    ? promotions
    : promotions.filter((p) => {
        const s = getPromoStatus(p);
        if (filter === "ended") return s === "ended" || s === "inactive";
        return s === filter;
      });

  return (
    <div className="min-h-screen bg-background pb-32 animate-page">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link
            href="/home"
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-[18px] font-light italic text-on-surface leading-none">
              Ofertas
            </h1>
          </div>
          <button
            onClick={openNew}
            className="hidden md:flex items-center gap-2 bg-primary text-on-primary px-5 py-2 rounded-full font-ui font-medium text-[13px] shadow-primary-sm hover:bg-primary-hover transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Nueva oferta
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-5">

        {/* Error banner */}
        {error && !showModal && (
          <div className="bg-error-surface rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-3">
            <p className="font-ui text-[13px] text-error flex-1">{error}</p>
            <button onClick={() => setError(null)} aria-label="Cerrar">
              <XMarkIcon className="w-4 h-4 text-error" />
            </button>
          </div>
        )}

        {/* ── Filter chips ──────────────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-5 hide-scrollbar">
          {FILTER_CHIPS.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setFilter(chip.key)}
              className={`musa-chip${filter === chip.key ? " musa-chip-active" : ""}`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* ── Loading skeletons ────────────────────────────────────── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-raised border border-border-subtle border-l-2 border-l-border rounded-xl p-5 shadow-xs">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-16 h-[20px] rounded-full bg-surface-sunken animate-pulse" />
                  <div className="w-8 h-[28px] rounded bg-surface-sunken animate-pulse" />
                </div>
                <div className="space-y-2.5">
                  <div
                    className="h-[15px] rounded bg-surface-sunken animate-pulse"
                    style={{ width: `${50 + (i * 15) % 30}%` }}
                  />
                  <div className="h-[11px] rounded bg-surface-sunken animate-pulse w-[75%]" />
                  <div className="h-[10px] rounded bg-surface-sunken animate-pulse w-[45%]" />
                </div>
                <div className="mt-4 pt-4 border-t border-border-subtle flex gap-2">
                  <div className="flex-1 h-10 rounded-full bg-surface-sunken animate-pulse" />
                  <div className="w-10 h-10 rounded-xl bg-surface-sunken animate-pulse" />
                  <div className="w-10 h-10 rounded-xl bg-surface-sunken animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────── */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center px-1">
            <div className="musa-rule w-[60px] mb-8" />
            <p
              className="font-display font-light italic text-on-surface mb-2"
              style={{ fontSize: "26px" }}
            >
              {filter !== "all" ? "Sin ofertas aquí." : "Aún no hay ofertas."}
            </p>
            <p className="font-ui text-[13px] text-on-surface-muted max-w-[240px] mb-8">
              {filter !== "all"
                ? "Prueba otro filtro o crea una nueva oferta."
                : "Crea tu primera oferta para fidelizar clientas y aumentar reservas."}
            </p>
            {filter === "all" && (
              <button
                onClick={openNew}
                className="inline-flex items-center gap-2 border border-primary text-primary px-6 py-2.5 rounded-full font-ui font-medium text-[13px] hover:bg-primary-surface transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Crear primera oferta
              </button>
            )}
          </div>
        )}

        {/* ── Promo cards ──────────────────────────────────────────── */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map((promo) => {
              const status = getPromoStatus(promo);
              const border = STATUS_BORDER[status];
              const dim    = status === "ended" || status === "inactive";
              return (
                <div
                  key={promo.id}
                  className={`bg-surface-raised border border-border-subtle border-l-2 ${border} rounded-xl shadow-xs transition-all duration-200 ${
                    dim ? "opacity-60" : "hover:shadow-md hover:-translate-y-px"
                  }`}
                >
                  <div className="p-5">

                    {/* Top row: status tag + discount */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <span className={STATUS_TAG[status]}>
                        {STATUS_LABEL[status]}
                      </span>
                      <div className="flex flex-col items-end flex-shrink-0 leading-none">
                        <span
                          className="font-display font-normal text-primary leading-none"
                          style={{ fontSize: "28px" }}
                        >
                          {promo.discount}
                        </span>
                        <span className="font-ui font-medium text-primary mt-0.5" style={{ fontSize: "10.5px", letterSpacing: "0.08em" }}>
                          % dto.
                        </span>
                      </div>
                    </div>

                    {/* Title + description */}
                    <h3 className="font-ui font-medium text-[15px] text-on-surface leading-snug">
                      {promo.title}
                    </h3>
                    {promo.description && (
                      <p className="font-ui text-[12px] text-on-surface-muted mt-1 line-clamp-2 leading-relaxed">
                        {promo.description}
                      </p>
                    )}

                    {/* Dates */}
                    <p className="font-ui text-[11px] text-on-surface-subtle mt-2.5">
                      {formatDate(promo.validFrom)}
                      <span className="mx-1.5 text-on-surface-subtle">·</span>
                      {formatDate(promo.validUntil)}
                    </p>

                    {/* Actions */}
                    <div className="mt-4 pt-4 border-t border-border-subtle flex items-center gap-2">
                      <button
                        onClick={() => handleBroadcast(promo)}
                        disabled={!!broadcasting || status !== "active"}
                        className="flex-1 h-10 border border-primary-border text-primary font-ui font-medium text-[13px] rounded-full flex items-center justify-center gap-1.5 hover:bg-primary-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {broadcasting === promo.id ? (
                          <div className="w-4 h-4 border border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <PaperAirplaneIcon className="w-3.5 h-3.5" />
                        )}
                        Enviar push
                      </button>

                      <button
                        onClick={() => openEdit(promo)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-muted hover:text-on-surface hover:bg-surface-sunken transition-colors"
                        aria-label="Editar"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(promo.id)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-error hover:bg-error-surface transition-colors"
                        aria-label="Eliminar"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── FAB mobile ──────────────────────────────────────────────── */}
      <button
        onClick={openNew}
        className="md:hidden fixed bottom-28 right-5 w-14 h-14 rounded-full bg-primary text-on-primary shadow-primary-md flex items-center justify-center active:scale-90 transition-transform z-50 hover:bg-primary-hover musa-fab"
        aria-label="Nueva oferta"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* ── Create / Edit modal ─────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-espresso-900/55"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className="bg-background w-full max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto">

            {/* Modal header */}
            <div className="sticky top-0 bg-background/96 backdrop-blur-sm z-10 flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border-subtle">
              <div className="flex-1 min-w-0">
                <p className="musa-sublabel mb-0.5">
                  {editingId ? "Editar oferta" : "Nueva oferta"}
                </p>
                <h2 className="font-display font-normal text-[20px] text-on-surface leading-tight truncate">
                  {editingId
                    ? (promotions.find((p) => p.id === editingId)?.title ?? "Oferta")
                    : "Oferta"}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors flex-shrink-0"
                aria-label="Cerrar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSubmit} className="px-6 pt-5 pb-10 space-y-5">

              {/* Error */}
              {error && (
                <div className="bg-error-surface rounded-xl px-4 py-3 font-ui text-[13px] text-error">
                  {error}
                </div>
              )}

              {/* Título */}
              <div>
                <span className="musa-sublabel block mb-2">Título *</span>
                <input
                  className="musa-input"
                  placeholder="Manicura con 20% de descuento"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>

              {/* Descripción */}
              <div>
                <span className="musa-sublabel block mb-2">Descripción *</span>
                <textarea
                  className="w-full px-4 py-3 bg-surface-raised border border-border rounded-xl font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle outline-none focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(181,89,62,0.12)] transition-all duration-150 resize-none"
                  placeholder="Detalles de la oferta…"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  required
                />
              </div>

              {/* Descuento + fechas */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <span className="musa-sublabel block mb-2">% Descuento</span>
                  <input
                    className="musa-input"
                    type="number"
                    min={1}
                    max={100}
                    value={form.discount}
                    onChange={(e) => setForm((f) => ({ ...f, discount: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <span className="musa-sublabel block mb-2">Desde</span>
                  <input
                    className="musa-input"
                    type="date"
                    value={form.validFrom}
                    onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <span className="musa-sublabel block mb-2">Hasta</span>
                  <input
                    className="musa-input"
                    type="date"
                    value={form.validUntil}
                    onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Visible toggle */}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, isActive: !f.isActive }))}
                className="w-full flex items-start gap-3 text-left group"
              >
                <div
                  className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors ${
                    form.isActive
                      ? "bg-primary border-primary"
                      : "border-border group-hover:border-primary-border"
                  }`}
                >
                  {form.isActive && <CheckIcon className="w-3 h-3 text-on-primary" />}
                </div>
                <div>
                  <p className="font-ui text-[13px] font-medium text-on-surface">
                    Visible en la página pública
                  </p>
                  <p className="font-ui text-[12px] text-on-surface-muted mt-0.5 leading-snug">
                    Las clientas verán esta oferta al reservar.
                  </p>
                </div>
              </button>

              {/* Action buttons */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full h-[50px] bg-primary text-on-primary rounded-full font-ui font-medium text-[15px] shadow-primary-sm hover:bg-primary-hover transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <div className="w-4 h-4 border border-on-primary border-t-transparent rounded-full animate-spin" />
                  ) : (
                    editingId ? "Guardar cambios" : "Crear oferta"
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full h-[44px] font-ui font-medium text-[13px] text-on-surface-muted hover:text-on-surface transition-colors"
                >
                  Cancelar
                </button>

                {editingId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingId)}
                    disabled={saving}
                    className="w-full h-[44px] border border-error-surface text-error font-ui font-medium text-[13px] rounded-full hover:bg-error-surface transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                    Eliminar oferta
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
