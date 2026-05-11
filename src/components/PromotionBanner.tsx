"use client";

import { useState } from "react";
import { XMarkIcon, ArrowRightIcon, ClockIcon } from "@heroicons/react/24/outline";

interface Promotion {
  id:          string;
  title:       string;
  description: string;
  discount:    number;
  validUntil:  string;
}

interface Props {
  promotions: Promotion[];
  onBook?: () => void;
}

export default function PromotionBanner({ promotions, onBook }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);

  if (promotions.length === 0) return null;

  const promo = promotions[activeIdx];

  const daysLeft = Math.ceil(
    (new Date(promo.validUntil).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <>
      {/* ── Compact banner ───────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="w-full text-left bg-primary-surface border border-primary-border rounded-xl p-4 hover:shadow-sm active:scale-[0.99] transition-all duration-150"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="font-ui font-medium text-primary block mb-1" style={{ fontSize: "10.5px", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {promotions.length > 1 ? `${promotions.length} ofertas disponibles` : "Oferta especial"}
            </span>
            <p className="font-ui font-medium text-[14px] text-on-surface leading-snug truncate">
              {promo.title}
            </p>
            <p className="font-ui text-[12px] text-on-surface-muted mt-1">
              {daysLeft <= 1 ? "¡Solo hoy!" : `Válida por ${daysLeft} días más`}
            </p>
          </div>

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

        {/* Dot indicators for multiple promos */}
        {promotions.length > 1 && (
          <div className="flex gap-1.5 mt-3">
            {promotions.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setActiveIdx(i); }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === activeIdx ? "bg-primary" : "bg-primary-border"
                }`}
              />
            ))}
          </div>
        )}
      </button>

      {/* ── Detail modal ─────────────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-espresso-900/55"
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
        >
          <div className="bg-background w-full max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl">

            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-border-subtle">
              <div className="flex-1 min-w-0">
                <p className="musa-sublabel mb-0.5">Oferta especial</p>
                <h2 className="font-display font-normal text-[20px] text-on-surface leading-tight truncate">
                  {promo.title}
                </h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors flex-shrink-0"
                aria-label="Cerrar"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 pt-5 pb-8 space-y-5">

              {/* Discount — editorial number */}
              <div className="flex items-baseline gap-2">
                <span
                  className="font-display font-normal text-primary leading-none"
                  style={{ fontSize: "48px", letterSpacing: "-0.02em" }}
                >
                  {promo.discount}
                </span>
                <span className="font-ui font-medium text-primary text-[16px]">
                  % de descuento
                </span>
              </div>

              {/* Description */}
              {promo.description && (
                <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed">
                  {promo.description}
                </p>
              )}

              {/* Expiry */}
              <div className="flex items-center gap-2 bg-surface-sunken rounded-xl px-4 py-3">
                <ClockIcon className="w-4 h-4 text-on-surface-muted flex-shrink-0" />
                <p className="font-ui text-[13px] text-on-surface-muted">
                  Válida hasta{" "}
                  <span className="font-medium text-on-surface">
                    {new Date(promo.validUntil).toLocaleDateString("es-VE", {
                      day:   "numeric",
                      month: "long",
                    })}
                  </span>
                </p>
              </div>

              {/* CTA */}
              <button
                onClick={() => { setModalOpen(false); onBook?.(); }}
                className="w-full h-[50px] bg-primary text-on-primary rounded-full font-ui font-medium text-[15px] shadow-primary-sm hover:bg-primary-hover transition-colors flex items-center justify-center gap-2"
              >
                Reservar ahora
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
