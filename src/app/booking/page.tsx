"use client";

import { useState } from "react";
import Image from "next/image";

export default function Booking() {
  const [showModal, setShowModal] = useState(false);

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setShowModal(true);
  };

  return (
    <div className="bg-background font-body text-on-surface antialiased min-h-screen">
      {/* Top Navigation (Shell suppressed for transactional focus) */}
      <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-lg px-6 py-4 flex items-center justify-between shadow-sm shadow-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden relative">
            <Image
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuApfWxZ2vWecuBtL1wnWFigEXWkMvS-XiWXPGf5LlcwmQK23GJCJ8dSnc3084nNzUy4_haWztAfqGpyI4ReRJJwwbE84Im83JQnBRUizJz2aOw3NQDB5A9h5yjoeZQbYrfumqLy9sX5OjjUlIjBR3n3raAtWEY-9AdNJ2INab9OamKYjuiL__NGSWDVkhrDpkXQUFhHIhtDX-ykKK6bAe7Q8kThu2fozhfQA-lv8PLj70lrK1iOdRP6-oJxNP6mLJA-uZ00vvqvS7Bi"
              alt="Professional stylist profile picture"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h1 className="font-headline text-sm font-bold tracking-tight text-zinc-900">
              Ana Lopez
            </h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
              Estilista Senior
            </p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-purple-50 transition-colors">
          <span className="material-symbols-outlined">share</span>
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-10">
        {/* Hero Section */}
        <section className="relative space-y-4">
          <div className="space-y-2">
            <h2 className="font-headline text-3xl font-extrabold tracking-tighter text-on-surface">
              Agendar Cita
            </h2>
            <p className="text-on-surface-variant leading-relaxed max-w-md">
              Especialista en colorimetría y diseño de imagen. Permíteme
              transformar tu estilo en una experiencia de lujo y bienestar.
            </p>
          </div>
        </section>

        <form onSubmit={handleBooking}>
          {/* Service Selection */}
          <section className="space-y-6 mb-10">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">
                Seleccionar Servicio
              </h3>
              <span className="text-xs font-medium text-primary bg-primary-fixed px-3 py-1 rounded-full">
                Paso 1 de 3
              </span>
            </div>

            <div className="grid gap-4">
              {/* Service Card 1 */}
              <label className="group cursor-pointer relative block">
                <input
                  className="peer hidden"
                  name="service"
                  type="radio"
                  defaultChecked
                />
                <div className="p-5 rounded-xl bg-surface-container-lowest transition-all duration-300 peer-checked:bg-primary-container/10 border-l-4 border-primary shadow-sm group-hover:translate-x-1">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-headline font-bold text-on-surface">
                        Corte de Diseño & Styling
                      </h4>
                      <p className="text-sm text-on-surface-variant">
                        Incluye lavado premium y acabado profesional.
                      </p>
                      <div className="flex items-center gap-3 pt-2">
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>{" "}
                          60 min
                        </span>
                        <span className="text-sm font-bold text-primary">
                          $45.00
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-colors">
                      <span className="material-symbols-outlined text-white text-xs opacity-0 peer-checked:opacity-100">
                        check
                      </span>
                    </div>
                  </div>
                </div>
              </label>

              {/* Service Card 2 */}
              <label className="group cursor-pointer relative block">
                <input className="peer hidden" name="service" type="radio" />
                <div className="p-5 rounded-xl bg-surface-container-lowest transition-all duration-300 peer-checked:bg-primary-container/10 border-l-4 border-secondary shadow-sm group-hover:translate-x-1">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-headline font-bold text-on-surface">
                        Balayage Signature
                      </h4>
                      <p className="text-sm text-on-surface-variant">
                        Técnica avanzada de aclarado natural.
                      </p>
                      <div className="flex items-center gap-3 pt-2">
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>{" "}
                          180 min
                        </span>
                        <span className="text-sm font-bold text-primary">
                          $120.00
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-colors">
                      <span className="material-symbols-outlined text-white text-xs opacity-0 peer-checked:opacity-100">
                        check
                      </span>
                    </div>
                  </div>
                </div>
              </label>

              {/* Service Card 3 */}
              <label className="group cursor-pointer relative block">
                <input className="peer hidden" name="service" type="radio" />
                <div className="p-5 rounded-xl bg-surface-container-lowest transition-all duration-300 peer-checked:bg-primary-container/10 border-l-4 border-tertiary shadow-sm group-hover:translate-x-1">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h4 className="font-headline font-bold text-on-surface">
                        Tratamiento Hidratación Profunda
                      </h4>
                      <p className="text-sm text-on-surface-variant">
                        Recuperación capilar con productos orgánicos.
                      </p>
                      <div className="flex items-center gap-3 pt-2">
                        <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm">
                            schedule
                          </span>{" "}
                          45 min
                        </span>
                        <span className="text-sm font-bold text-primary">
                          $35.00
                        </span>
                      </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-outline-variant flex items-center justify-center peer-checked:border-primary peer-checked:bg-primary transition-colors">
                      <span className="material-symbols-outlined text-white text-xs opacity-0 peer-checked:opacity-100">
                        check
                      </span>
                    </div>
                  </div>
                </div>
              </label>
            </div>
          </section>

          {/* Date & Time Picker */}
          <section className="space-y-6 mb-10">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Fecha y Hora</h3>
              <span className="text-xs font-medium text-primary bg-primary-fixed px-3 py-1 rounded-full">
                Paso 2 de 3
              </span>
            </div>

            {/* Simple Date Scroller */}
            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              <button
                type="button"
                className="flex-shrink-0 w-16 h-20 rounded-2xl bg-primary-container text-white flex flex-col items-center justify-center gap-1 shadow-lg shadow-primary-container/20"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Hoy
                </span>
                <span className="text-xl font-bold">14</span>
                <span className="text-[10px] font-medium">May</span>
              </button>
              <button
                type="button"
                className="flex-shrink-0 w-16 h-20 rounded-2xl bg-surface-container-lowest text-on-surface flex flex-col items-center justify-center gap-1 hover:bg-surface-container transition-colors"
              >
                <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                  Mié
                </span>
                <span className="text-xl font-bold">15</span>
                <span className="text-[10px] font-medium text-on-surface-variant">
                  May
                </span>
              </button>
              <button
                type="button"
                className="flex-shrink-0 w-16 h-20 rounded-2xl bg-surface-container-lowest text-on-surface flex flex-col items-center justify-center gap-1 hover:bg-surface-container transition-colors"
              >
                <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                  Jue
                </span>
                <span className="text-xl font-bold">16</span>
                <span className="text-[10px] font-medium text-on-surface-variant">
                  May
                </span>
              </button>
              <button
                type="button"
                className="flex-shrink-0 w-16 h-20 rounded-2xl bg-surface-container-lowest text-on-surface flex flex-col items-center justify-center gap-1 hover:bg-surface-container transition-colors"
              >
                <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                  Vie
                </span>
                <span className="text-xl font-bold">17</span>
                <span className="text-[10px] font-medium text-on-surface-variant">
                  May
                </span>
              </button>
              <button
                type="button"
                className="flex-shrink-0 w-16 h-20 rounded-2xl bg-surface-container-lowest text-on-surface flex flex-col items-center justify-center gap-1 hover:bg-surface-container transition-colors"
              >
                <span className="text-[10px] font-medium uppercase tracking-widest text-on-surface-variant">
                  Sáb
                </span>
                <span className="text-xl font-bold">18</span>
                <span className="text-[10px] font-medium text-on-surface-variant">
                  May
                </span>
              </button>
            </div>

            {/* Time Grid */}
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                className="py-3 rounded-xl bg-surface-container-lowest text-on-surface font-medium hover:bg-primary-fixed-dim hover:text-primary-fixed transition-colors text-sm text-center"
              >
                09:00 AM
              </button>
              <button
                type="button"
                className="py-3 rounded-xl bg-surface-container-lowest text-on-surface font-medium hover:bg-primary-fixed-dim hover:text-primary-fixed transition-colors text-sm text-center border-2 border-primary-fixed"
              >
                10:30 AM
              </button>
              <button
                type="button"
                className="py-3 rounded-xl bg-surface-container-lowest text-on-surface font-medium hover:bg-primary-fixed-dim hover:text-primary-fixed transition-colors text-sm text-center"
              >
                12:00 PM
              </button>
              <button
                type="button"
                className="py-3 rounded-xl bg-surface-container-lowest text-on-surface font-medium hover:bg-primary-fixed-dim hover:text-primary-fixed transition-colors text-sm text-center"
              >
                02:30 PM
              </button>
              <button
                type="button"
                disabled
                className="py-3 rounded-xl bg-surface-container-lowest text-on-surface font-medium hover:bg-primary-fixed-dim hover:text-primary-fixed transition-colors text-sm text-center opacity-40 cursor-not-allowed"
              >
                04:00 PM
              </button>
              <button
                type="button"
                className="py-3 rounded-xl bg-surface-container-lowest text-on-surface font-medium hover:bg-primary-fixed-dim hover:text-primary-fixed transition-colors text-sm text-center"
              >
                05:30 PM
              </button>
            </div>
          </section>

          {/* Final Step */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">
                Datos de Contacto
              </h3>
              <span className="text-xs font-medium text-primary bg-primary-fixed px-3 py-1 rounded-full">
                Paso 3 de 3
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="Nombre completo"
                  type="text"
                  required
                />
              </div>
              <div>
                <input
                  className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="Teléfono"
                  type="tel"
                  required
                />
              </div>
            </div>
          </section>

          {/* Bottom Action Bar (Glassmorphic) */}
          <div className="fixed bottom-0 left-0 w-full p-6 bg-white/80 backdrop-blur-xl z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
            <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
              <div className="hidden sm:block">
                <p className="text-xs text-on-surface-variant font-medium">
                  Total estimado
                </p>
                <p className="text-2xl font-headline font-bold text-primary">
                  $45.00
                </p>
              </div>
              <button
                type="submit"
                className="flex-1 h-14 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                Reservar Ahora
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
          </div>
        </form>

        {/* Confirmation Modal Overlay */}
        {showModal && (
          <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-2xl shadow-purple-500/10 max-w-sm w-full text-center space-y-8 animate-in fade-in zoom-in duration-300">
              <div className="w-24 h-24 bg-tertiary-fixed rounded-full flex items-center justify-center mx-auto">
                <span
                  className="material-symbols-outlined text-4xl text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check_circle
                </span>
              </div>
              <div className="space-y-2">
                <h2 className="font-headline text-3xl font-extrabold tracking-tighter text-on-surface">
                  Reserva Confirmada
                </h2>
                <p className="text-on-surface-variant">
                  Ana te espera el 14 de Mayo a las 10:30 AM.
                </p>
              </div>
              <div className="p-4 bg-surface-container-low rounded-2xl text-left flex items-start gap-4">
                <span className="material-symbols-outlined text-tertiary">
                  calendar_today
                </span>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Servicio
                  </p>
                  <p className="font-bold text-on-surface">
                    Corte de Diseño & Styling
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <button className="w-full h-14 bg-[#25D366] text-white font-bold rounded-full flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-transform">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"></path>
                  </svg>
                  Confirmar por WhatsApp
                </button>
                <button
                  type="button"
                  className="w-full h-14 bg-surface-container-high text-on-surface font-bold rounded-full hover:bg-surface-container transition-colors"
                  onClick={() => setShowModal(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
