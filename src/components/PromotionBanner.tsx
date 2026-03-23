"use client";

import { useState } from "react";

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: string;
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
      {/* Banner compacto */}
      <div
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary via-primary-container to-purple-400 p-5 cursor-pointer shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
        onClick={() => setModalOpen(true)}
      >
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/70 uppercase tracking-widest">
                Promo especial
              </span>
              {promotions.length > 1 && (
                <span className="text-[10px] bg-white/20 text-white rounded-full px-2 py-0.5 font-bold">
                  {promotions.length} ofertas
                </span>
              )}
            </div>
            <h3 className="font-headline text-white font-extrabold text-xl leading-tight">
              {promo.title}
            </h3>
            <p className="text-white/80 text-xs">
              Válida por {daysLeft <= 1 ? "¡solo hoy!" : `${daysLeft} días más`}
            </p>
          </div>

          <div className="flex-shrink-0 text-center">
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex flex-col items-center justify-center">
              <span className="text-white font-extrabold text-xl leading-none">
                {promo.discount}%
              </span>
              <span className="text-white/70 text-[10px] font-bold">OFF</span>
            </div>
          </div>
        </div>

        {/* Dot indicators for multiple promos */}
        {promotions.length > 1 && (
          <div className="flex gap-1.5 mt-3 justify-center">
            {promotions.map((_, i) => (
              <button
                key={i}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveIdx(i);
                }}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === activeIdx ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de detalle */}
      {modalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl space-y-6 animate-in slide-in-from-bottom-4 duration-300">
            {/* Discount badge */}
            <div className="flex items-center justify-between">
              <div className="bg-gradient-to-r from-primary to-primary-container px-5 py-2 rounded-full">
                <span className="text-white font-extrabold text-2xl">{promo.discount}% OFF</span>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-on-surface-variant">close</span>
              </button>
            </div>

            <div className="space-y-2">
              <h2 className="font-headline text-2xl font-extrabold tracking-tighter text-on-surface">
                {promo.title}
              </h2>
              <p className="text-on-surface-variant leading-relaxed">{promo.description}</p>
            </div>

            <div className="flex items-center gap-2 bg-surface-container px-4 py-3 rounded-xl">
              <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                timer
              </span>
              <p className="text-sm text-on-surface-variant">
                Válida hasta{" "}
                <strong className="text-on-surface">
                  {new Date(promo.validUntil).toLocaleDateString("es-VE", {
                    day: "numeric",
                    month: "long",
                  })}
                </strong>
              </p>
            </div>

            <button
              onClick={() => {
                setModalOpen(false);
                onBook?.();
              }}
              className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                calendar_add_on
              </span>
              Reservar ahora con descuento
            </button>
          </div>
        </div>
      )}
    </>
  );
}
