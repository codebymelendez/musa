"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { TimeSlot, formatCurrency, formatTimeES } from "@/lib/utils";
import { Service } from "@/types";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import PromotionBanner from "@/components/PromotionBanner";

interface PublicProfile {
  name: string;
  slug: string;
  bio: string | null;
  avatarUrl: string | null;
  serviceType: string | null;
  whatsapp: string | null;
  instagram: string | null;
}

interface PublicData {
  professional: PublicProfile;
  services: Service[];
  settings: {
    workDays: number[];
    startHour: number;
    endHour: number;
    slotDuration: number;
    currency: string;
    bookingEnabled: boolean;
  };
  slots: TimeSlot[] | null;
}

interface Promotion {
  id: string;
  title: string;
  description: string;
  discount: number;
  validUntil: string;
}

type BookingStep = "service" | "datetime" | "contact" | "confirmed";

const DAYS_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getNext14Days(): Date[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function PublicBookingPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [data, setData] = useState<PublicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  // Booking state
  const [step, setStep] = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  // Contact + opt-in state
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [wantsNotifications, setWantsNotifications] = useState(false);

  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<{
    appointmentId: string;
    clientId: string;
    serviceName: string;
    startTime: string;
    whatsapp: string | null;
  } | null>(null);

  // Push para la clienta (solo se activa post-confirmación)
  const { subscribe: activatePush, loading: pushLoading, subscribed: pushSubscribed } =
    usePushSubscription({
      endpoint: "/api/push/subscribe-client",
      clientId: confirmed?.clientId,
    });

  const next14Days = getNext14Days();

  // ── Detectar visita repetida via localStorage ──────────────────────────────
  useEffect(() => {
    const savedName = localStorage.getItem(`musa_name_${slug}`);
    const savedPhone = localStorage.getItem(`musa_phone_${slug}`);
    if (savedName) setClientName(savedName);
    if (savedPhone) setClientPhone(savedPhone);
  }, [slug]);

  // ── Cargar perfil público + promociones ────────────────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [profileRes, promoRes] = await Promise.all([
          fetch(`/api/public/${slug}`),
          fetch(`/api/public/${slug}/promotions`),
        ]);
        if (!profileRes.ok) {
          const d = await profileRes.json();
          setError(d.error ?? "Profesional no encontrada");
          return;
        }
        const d: PublicData = await profileRes.json();
        setData(d);

        if (promoRes.ok) {
          const pd = await promoRes.json();
          setPromotions(pd.promotions ?? []);
        }
      } catch {
        setError("Error al cargar el perfil");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [slug]);

  // ── Cargar slots ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedService || step !== "datetime") return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const dateStr = selectedDate.toISOString().split("T")[0];
        const res = await fetch(
          `/api/public/${slug}?date=${dateStr}&serviceId=${selectedService.id}`
        );
        const d = await res.json();
        setSlots(d.slots ?? []);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedService, selectedDate, step, slug]);

  const handleBook = useCallback(async () => {
    if (!selectedService || !selectedSlot || !clientName || !clientPhone) return;
    setBooking(true);
    try {
      const res = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: selectedService.id,
          startTime: selectedSlot.datetime,
          clientName,
          clientPhone,
          clientEmail: clientEmail || undefined,
          wantsNotifications,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        alert(d.error ?? "Error al reservar");
        return;
      }

      // Guardar datos para visitas futuras
      localStorage.setItem(`musa_name_${slug}`, clientName);
      localStorage.setItem(`musa_phone_${slug}`, clientPhone);
      localStorage.setItem(`musa_clientId_${slug}`, d.clientId);

      setConfirmed({
        appointmentId: d.appointment.id,
        clientId: d.clientId,
        serviceName: selectedService.name,
        startTime: d.appointment.startTime,
        whatsapp: d.professional.whatsapp,
      });
      setStep("confirmed");
    } catch {
      alert("Error al procesar la reserva");
    } finally {
      setBooking(false);
    }
  }, [selectedService, selectedSlot, clientName, clientPhone, clientEmail, wantsNotifications, slug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="material-symbols-outlined text-primary animate-spin text-4xl">
          progress_activity
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6">
        <span className="material-symbols-outlined text-5xl text-on-surface-variant">person_off</span>
        <h2 className="font-headline text-2xl font-bold text-on-surface">{error ?? "No encontrado"}</h2>
        <p className="text-on-surface-variant text-center">Este enlace de reserva no está disponible.</p>
      </div>
    );
  }

  const { professional, services } = data;
  const isReturningClient = !!localStorage.getItem(`musa_name_${slug}`);

  return (
    <div className="bg-background font-body text-on-surface antialiased min-h-screen">
      {/* Header */}
      <header className="fixed top-0 w-full z-40 bg-white/80 backdrop-blur-lg px-6 py-4 flex items-center justify-between shadow-sm shadow-purple-500/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-surface-container-high overflow-hidden relative">
            {professional.avatarUrl ? (
              <Image src={professional.avatarUrl} alt={professional.name} fill className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-lg">person</span>
              </div>
            )}
          </div>
          <div>
            <h1 className="font-headline text-sm font-bold tracking-tight text-zinc-900">
              {professional.name}
            </h1>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest capitalize">
              {professional.serviceType ?? "Profesional de belleza"}
            </p>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-purple-50 transition-colors">
          <span className="material-symbols-outlined">share</span>
        </button>
      </header>

      <main className="pt-24 pb-32 px-6 max-w-2xl mx-auto space-y-8">
        {/* Bienvenida a clientas que regresan */}
        {isReturningClient && step === "service" && (
          <div className="bg-primary-fixed/30 rounded-2xl px-5 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              favorite
            </span>
            <p className="text-sm font-medium text-on-surface">
              ¡Bienvenida de nuevo, <strong>{clientName || "guapa"}</strong>! 👋
            </p>
          </div>
        )}

        {/* Banners de promociones activas */}
        {promotions.length > 0 && step === "service" && (
          <PromotionBanner
            promotions={promotions}
            onBook={() => {
              // Scroll al selector de servicios
              window.scrollTo({ top: 300, behavior: "smooth" });
            }}
          />
        )}

        {/* Hero */}
        <section className="space-y-2">
          <h2 className="font-headline text-3xl font-extrabold tracking-tighter text-on-surface">
            Agendar Cita
          </h2>
          {professional.bio && (
            <p className="text-on-surface-variant leading-relaxed max-w-md">{professional.bio}</p>
          )}
        </section>

        {/* ── PASO 1: Seleccionar servicio ─────────────────────────────────── */}
        {step === "service" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Seleccionar Servicio</h3>
              <span className="text-xs font-medium text-primary bg-primary-fixed px-3 py-1 rounded-full">
                Paso 1 de 3
              </span>
            </div>
            <div className="grid gap-4">
              {services.map((s) => (
                <label key={s.id} className="group cursor-pointer relative block">
                  <input
                    className="peer hidden"
                    name="service"
                    type="radio"
                    checked={selectedService?.id === s.id}
                    onChange={() => setSelectedService(s as unknown as Service)}
                    readOnly
                  />
                  <div
                    onClick={() => setSelectedService(s as unknown as Service)}
                    className="p-5 rounded-xl bg-surface-container-lowest transition-all duration-300 peer-checked:bg-primary-container/10 border-l-4 border-primary shadow-sm group-hover:translate-x-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h4 className="font-headline font-bold text-on-surface">{s.name}</h4>
                        {s.description && (
                          <p className="text-sm text-on-surface-variant">{s.description}</p>
                        )}
                        <div className="flex items-center gap-3 pt-2">
                          <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {s.durationMin} min
                          </span>
                          <span className="text-sm font-bold text-primary">
                            {formatCurrency(s.price, s.currency)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          selectedService?.id === s.id
                            ? "border-primary bg-primary"
                            : "border-outline-variant"
                        }`}
                      >
                        {selectedService?.id === s.id && (
                          <span className="material-symbols-outlined text-white text-xs">check</span>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </section>
        )}

        {/* ── PASO 2: Fecha y hora ──────────────────────────────────────────── */}
        {step === "datetime" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Fecha y Hora</h3>
              <span className="text-xs font-medium text-primary bg-primary-fixed px-3 py-1 rounded-full">
                Paso 2 de 3
              </span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 hide-scrollbar">
              {next14Days.map((day, i) => {
                const isSelected = day.toDateString() === selectedDate.toDateString();
                const isToday = i === 0;
                const dayOfWeek = day.getDay();
                const isWorkday = data.settings.workDays.includes(dayOfWeek);

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!isWorkday}
                    onClick={() => setSelectedDate(day)}
                    className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 transition-colors ${
                      isSelected
                        ? "bg-primary-container text-white shadow-lg shadow-primary-container/20"
                        : isWorkday
                        ? "bg-surface-container-lowest text-on-surface hover:bg-surface-container"
                        : "bg-surface-container-lowest text-on-surface-variant opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                      {isToday ? "Hoy" : DAYS_ES[day.getDay()]}
                    </span>
                    <span className="text-xl font-bold">{day.getDate()}</span>
                    <span className="text-[10px] font-medium">{MONTHS_ES[day.getMonth()]}</span>
                  </button>
                );
              })}
            </div>

            {slotsLoading ? (
              <div className="flex justify-center py-8">
                <span className="material-symbols-outlined text-primary animate-spin text-2xl">
                  progress_activity
                </span>
              </div>
            ) : slots.length === 0 ? (
              <p className="text-center text-on-surface-variant py-8">
                No hay horarios disponibles para este día
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {slots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot)}
                    className={`py-3 rounded-xl font-medium text-sm text-center transition-colors ${
                      !slot.available
                        ? "bg-surface-container-lowest text-on-surface-variant opacity-40 cursor-not-allowed"
                        : selectedSlot?.time === slot.time
                        ? "bg-primary text-on-primary font-bold"
                        : "bg-surface-container-lowest text-on-surface hover:bg-primary-fixed-dim hover:text-primary"
                    }`}
                  >
                    {slot.time}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── PASO 3: Datos de contacto + opt-in ───────────────────────────── */}
        {step === "contact" && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-lg font-bold">Datos de Contacto</h3>
              <span className="text-xs font-medium text-primary bg-primary-fixed px-3 py-1 rounded-full">
                Paso 3 de 3
              </span>
            </div>

            {/* Resumen */}
            <div className="p-4 bg-surface-container-low rounded-2xl space-y-1">
              <p className="font-bold text-on-surface">{selectedService?.name}</p>
              <p className="text-sm text-on-surface-variant">
                {selectedDate.toLocaleDateString("es-VE", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}{" "}
                · {selectedSlot?.time} ·{" "}
                {formatCurrency(selectedService?.price ?? 0, selectedService?.currency)}
              </p>
            </div>

            <div className="space-y-4">
              <input
                className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                placeholder="Nombre completo *"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                required
              />
              <input
                className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                placeholder="Teléfono *"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                required
              />

              {/* Opt-in de notificaciones */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <div
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    wantsNotifications
                      ? "bg-primary border-primary"
                      : "border-outline-variant group-hover:border-primary"
                  }`}
                  onClick={() => setWantsNotifications((v) => !v)}
                >
                  {wantsNotifications && (
                    <span className="material-symbols-outlined text-white text-xs">check</span>
                  )}
                </div>
                <div onClick={() => setWantsNotifications((v) => !v)}>
                  <p className="text-sm font-semibold text-on-surface">
                    Quiero recibir notificaciones y promociones
                  </p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Te avisaremos de recordatorios, confirmaciones y ofertas exclusivas de {professional.name}.
                  </p>
                </div>
              </label>

              {/* Email (requerido si quiere notificaciones) */}
              {wantsNotifications && (
                <input
                  className="w-full bg-surface-container-high border-none rounded-xl py-4 px-5 focus:ring-2 focus:ring-primary-container text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="Email (para recibir confirmaciones)"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  autoComplete="email"
                />
              )}
            </div>
          </section>
        )}

        {/* ── CONFIRMACIÓN ─────────────────────────────────────────────────── */}
        {step === "confirmed" && confirmed && (
          <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-center justify-center p-6">
            <div className="bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-2xl shadow-purple-500/10 max-w-sm w-full text-center space-y-6">
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
                  {professional.name} te espera el{" "}
                  {new Date(confirmed.startTime).toLocaleDateString("es-VE", {
                    day: "numeric",
                    month: "long",
                  })}{" "}
                  a las {formatTimeES(confirmed.startTime)}.
                </p>
              </div>

              {/* Activar push si marcó opt-in y no tiene suscripción aún */}
              {wantsNotifications && !pushSubscribed && (
                <button
                  onClick={activatePush}
                  disabled={pushLoading}
                  className="w-full h-12 bg-primary/10 text-primary font-bold rounded-2xl flex items-center justify-center gap-2 text-sm hover:bg-primary/20 transition-colors disabled:opacity-60"
                >
                  {pushLoading ? (
                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                      notifications_active
                    </span>
                  )}
                  {pushLoading ? "Activando..." : "Activar notificaciones en este dispositivo"}
                </button>
              )}

              {pushSubscribed && (
                <p className="text-xs text-on-surface-variant flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-sm text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  Notificaciones activadas
                </p>
              )}

              <div className="p-4 bg-surface-container-low rounded-2xl text-left flex items-start gap-4">
                <span className="material-symbols-outlined text-tertiary">calendar_today</span>
                <div>
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Servicio</p>
                  <p className="font-bold text-on-surface">{confirmed.serviceName}</p>
                </div>
              </div>

              <div className="space-y-3">
                {confirmed.whatsapp && (
                  <a
                    href={`https://wa.me/${confirmed.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Hola ${professional.name}, acabo de reservar una cita para ${confirmed.serviceName}. ¡Nos vemos pronto!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-14 bg-[#25D366] text-white font-bold rounded-full flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 hover:scale-[1.02] transition-transform"
                  >
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Confirmar por WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className="w-full h-14 bg-surface-container-high text-on-surface font-bold rounded-full hover:bg-surface-container transition-colors"
                  onClick={() => {
                    setStep("service");
                    setSelectedService(null);
                    setSelectedSlot(null);
                    setClientPhone("");
                    setClientEmail("");
                    setWantsNotifications(false);
                    setConfirmed(null);
                  }}
                >
                  Nueva Reserva
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Action Bar */}
      {step !== "confirmed" && (
        <div className="fixed bottom-0 left-0 w-full p-6 bg-white/80 backdrop-blur-xl z-50 rounded-t-[2.5rem] shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
            <div>
              {step !== "service" && (
                <button
                  onClick={() => {
                    if (step === "datetime") setStep("service");
                    else if (step === "contact") setStep("datetime");
                  }}
                  className="text-on-surface-variant font-semibold text-sm flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Volver
                </button>
              )}
              {selectedService && (
                <p className="text-2xl font-headline font-bold text-primary hidden sm:block">
                  {formatCurrency(selectedService.price, selectedService.currency)}
                </p>
              )}
            </div>

            <button
              disabled={
                (step === "service" && !selectedService) ||
                (step === "datetime" && !selectedSlot) ||
                (step === "contact" && (!clientName || !clientPhone)) ||
                booking
              }
              onClick={() => {
                if (step === "service" && selectedService) setStep("datetime");
                else if (step === "datetime" && selectedSlot) setStep("contact");
                else if (step === "contact") handleBook();
              }}
              className="flex-1 h-14 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {booking ? (
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
              ) : (
                <>
                  {step === "service"
                    ? "Seleccionar Fecha"
                    : step === "datetime"
                    ? "Datos de Contacto"
                    : "Reservar Ahora"}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
