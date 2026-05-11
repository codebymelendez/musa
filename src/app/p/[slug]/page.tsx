"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { TimeSlot, formatCurrency, formatTimeES } from "@/lib/utils";
import { Service } from "@/types";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import PromotionBanner from "@/components/PromotionBanner";
import {
  ArrowLeftIcon,
  ShareIcon,
  ClockIcon,
  CheckIcon,
  ArrowRightIcon,
  BellAlertIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/cn";

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

const DAYS_ES   = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTHS_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function getNext14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });
}

export default function PublicBookingPage() {
  const params = useParams();
  const slug   = params.slug as string;

  const [data, setData]             = useState<PublicData | null>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [step, setStep]                       = useState<BookingStep>("service");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate]       = useState<Date>(new Date());
  const [selectedSlot, setSelectedSlot]       = useState<TimeSlot | null>(null);
  const [slotsLoading, setSlotsLoading]       = useState(false);
  const [slots, setSlots]                     = useState<TimeSlot[]>([]);

  const [clientName,  setClientName]  = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [wantsNotifications, setWantsNotifications] = useState(false);
  const [booking, setBooking]         = useState(false);
  const [confirmed, setConfirmed]     = useState<{
    appointmentId: string;
    clientId: string;
    serviceName: string;
    startTime: string;
    whatsapp: string | null;
  } | null>(null);

  const { subscribe: activatePush, loading: pushLoading, subscribed: pushSubscribed } =
    usePushSubscription({ endpoint: "/api/push/subscribe-client", clientId: confirmed?.clientId });

  const next14Days = getNext14Days();

  useEffect(() => {
    const savedName  = localStorage.getItem(`musa_name_${slug}`);
    const savedPhone = localStorage.getItem(`musa_phone_${slug}`);
    if (savedName)  setClientName(savedName);
    if (savedPhone) setClientPhone(savedPhone);
  }, [slug]);

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
          serviceId:         selectedService.id,
          startTime:         selectedSlot.datetime,
          clientName,
          clientPhone,
          clientEmail:       clientEmail || undefined,
          wantsNotifications,
        }),
      });
      const d = await res.json();
      if (!res.ok) { alert(d.error ?? "Error al reservar"); return; }

      localStorage.setItem(`musa_name_${slug}`,     clientName);
      localStorage.setItem(`musa_phone_${slug}`,    clientPhone);
      localStorage.setItem(`musa_clientId_${slug}`, d.clientId);

      setConfirmed({
        appointmentId: d.appointment.id,
        clientId:      d.clientId,
        serviceName:   selectedService.name,
        startTime:     d.appointment.startTime,
        whatsapp:      d.professional.whatsapp,
      });
      setStep("confirmed");
    } catch {
      alert("Error al procesar la reserva");
    } finally {
      setBooking(false);
    }
  }, [selectedService, selectedSlot, clientName, clientPhone, clientEmail, wantsNotifications, slug]);

  /* ── Loading — skeleton layout ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-0 w-full z-40 glass-nav border-b border-border-subtle">
          <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-sunken animate-pulse flex-shrink-0" />
            <div className="space-y-1.5">
              <div className="w-28 h-[13px] rounded bg-surface-sunken animate-pulse" />
              <div className="w-16 h-[10px] rounded bg-surface-sunken animate-pulse" />
            </div>
          </div>
        </div>
        <div className="pt-20 px-5 max-w-2xl mx-auto">
          <div className="pt-8 mb-6 space-y-2">
            <div className="w-[55%] h-9 rounded bg-surface-sunken animate-pulse" />
            <div className="w-[72%] h-[14px] rounded bg-surface-sunken animate-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[88px] rounded-xl bg-surface-sunken animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ── Error ──────────────────────────────────────────────────────────── */
  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3 p-6">
        <div className="musa-rule w-[60px] mb-2" />
        <p
          className="font-display font-normal text-on-surface text-center"
          style={{ fontSize: "28px" }}
        >
          {error ?? "No encontrado."}
        </p>
        <p className="font-ui text-[14px] text-on-surface-muted text-center max-w-xs leading-relaxed">
          Este enlace de reserva no está disponible o ya no existe.
        </p>
      </div>
    );
  }

  const { professional, services } = data;
  const isReturningClient = typeof window !== "undefined"
    ? !!localStorage.getItem(`musa_name_${slug}`)
    : false;

  return (
    <div className="bg-background font-ui text-on-surface antialiased min-h-screen">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="fixed top-0 w-full z-40 glass-nav border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-50 overflow-hidden relative flex-shrink-0">
              {professional.avatarUrl ? (
                <Image
                  src={professional.avatarUrl}
                  alt={professional.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-ui font-medium text-[13px] text-sienna-700">
                  {professional.name[0]}
                </div>
              )}
            </div>
            <div>
              <h1 className="font-ui font-medium text-[14px] text-on-surface leading-tight">
                {professional.name}
              </h1>
              {professional.serviceType && (
                <p className="font-ui text-[11px] text-primary capitalize">
                  {professional.serviceType}
                </p>
              )}
            </div>
          </div>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
            aria-label="Compartir"
          >
            <ShareIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="pt-20 pb-36 px-5 max-w-2xl mx-auto space-y-7 min-h-[calc(100dvh-80px)]">

        {/* Returning client banner */}
        {isReturningClient && step === "service" && (
          <div className="bg-primary-surface border border-primary-border rounded-xl px-4 py-3 flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-primary flex-shrink-0" />
            <p className="font-ui text-[13px] font-medium text-on-surface">
              ¡Bienvenida de nuevo, {clientName || "guapa"}!
            </p>
          </div>
        )}

        {/* Promotions */}
        {promotions.length > 0 && step === "service" && (
          <PromotionBanner
            promotions={promotions}
            onBook={() => window.scrollTo({ top: 300, behavior: "smooth" })}
          />
        )}

        {/* Hero */}
        <section>
          <h2
            className="font-display font-normal text-on-surface leading-tight"
            style={{ fontSize: "32px", letterSpacing: "-0.02em" }}
          >
            Reservar cita
          </h2>
          {professional.bio && (
            <p className="font-ui text-[14px] text-on-surface-muted mt-2 leading-relaxed max-w-md">
              {professional.bio}
            </p>
          )}
        </section>

        {/* ── STEP 1: Servicio ────────────────────────────────────────── */}
        {step === "service" && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-ui font-medium text-[16px] text-on-surface">
                Seleccionar servicio
              </h3>
              <span className="musa-sublabel">01 / 03</span>
            </div>

            <div className="space-y-3">
              {services.map((s) => {
                const isSelected = selectedService?.id === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedService(s as unknown as Service)}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all duration-[160ms]",
                      isSelected
                        ? "bg-primary-surface border-primary shadow-primary-sm"
                        : "bg-surface-raised border-border-subtle hover:border-primary-border hover:shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-ui font-medium text-[15px] leading-tight",
                            isSelected ? "text-primary" : "text-on-surface"
                          )}
                        >
                          {s.name}
                        </p>
                        {s.description && (
                          <p className="font-ui text-[12px] text-on-surface-muted mt-1 leading-relaxed">
                            {s.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="flex items-center gap-1 text-on-surface-subtle">
                            <ClockIcon className="w-3.5 h-3.5" />
                            <span className="font-mono-num text-[12px]">{s.durationMin}</span>
                            <span className="font-ui text-[12px]">min</span>
                          </span>
                          <span className="font-mono-num text-[14px] text-primary">
                            {formatCurrency(s.price, s.currency)}
                          </span>
                        </div>
                      </div>
                      <div
                        className={cn(
                          "w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-colors",
                          isSelected ? "bg-primary border-primary" : "border-border"
                        )}
                      >
                        {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── STEP 2: Fecha y hora ──────────────────────────────────── */}
        {step === "datetime" && (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-ui font-medium text-[16px] text-on-surface">
                Fecha y hora
              </h3>
              <span className="musa-sublabel">02 / 03</span>
            </div>

            {/* Day picker */}
            <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
              {next14Days.map((day, i) => {
                const isSelected = day.toDateString() === selectedDate.toDateString();
                const isToday    = i === 0;
                const isWorkday  = data.settings.workDays.includes(day.getDay());

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!isWorkday}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      "flex-shrink-0 w-[60px] h-[76px] rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-[160ms]",
                      isSelected
                        ? "bg-primary text-on-primary shadow-primary-sm"
                        : isWorkday
                        ? "bg-surface-raised border border-border text-on-surface hover:border-primary-border"
                        : "bg-surface-sunken text-on-surface-subtle opacity-40 cursor-not-allowed"
                    )}
                  >
                    <span className="font-ui text-[10px] font-medium uppercase tracking-[0.08em]">
                      {isToday ? "Hoy" : DAYS_ES[day.getDay()]}
                    </span>
                    <span
                      className="font-display font-normal leading-none"
                      style={{ fontSize: "20px" }}
                    >
                      {day.getDate()}
                    </span>
                    <span className="font-ui text-[10px]">
                      {MONTHS_ES[day.getMonth()]}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            {slotsLoading ? (
              <div className="grid grid-cols-3 gap-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-surface-sunken rounded-xl animate-pulse" />
                ))}
              </div>
            ) : slots.length === 0 ? (
              <div className="py-10 text-center">
                <p className="font-ui text-[13px] text-on-surface-muted">
                  No hay horarios disponibles para este día.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot) => {
                  const displayTime = new Date(slot.datetime).toLocaleTimeString("es-VE", {
                    hour:   "2-digit",
                    minute: "2-digit",
                    hour12: true,
                  });
                  const isSelected = selectedSlot?.datetime === slot.datetime;
                  return (
                    <button
                      key={slot.datetime}
                      type="button"
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "h-12 rounded-xl font-mono-num text-[13px] text-center transition-all duration-[160ms]",
                        !slot.available
                          ? "bg-surface-sunken text-on-surface-subtle opacity-40 cursor-not-allowed"
                          : isSelected
                          ? "bg-primary text-on-primary shadow-primary-sm"
                          : "bg-surface-raised border border-border text-on-surface hover:border-primary-border hover:text-primary"
                      )}
                    >
                      {displayTime}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ── STEP 3: Contacto ──────────────────────────────────────── */}
        {step === "contact" && (
          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-ui font-medium text-[16px] text-on-surface">
                Tus datos
              </h3>
              <span className="musa-sublabel">03 / 03</span>
            </div>

            {/* Booking summary */}
            <div className="bg-primary-surface border border-primary-border rounded-xl p-4 space-y-1">
              <p className="font-ui font-medium text-[14px] text-primary">
                {selectedService?.name}
              </p>
              <p className="font-ui text-[13px] text-on-surface-muted">
                {selectedDate.toLocaleDateString("es-VE", {
                  weekday: "long",
                  day:     "numeric",
                  month:   "long",
                })}{" "}
                · {selectedSlot ? formatTimeES(selectedSlot.datetime) : ""}
                {" · "}
                <span className="font-mono-num">
                  {formatCurrency(selectedService?.price ?? 0, selectedService?.currency)}
                </span>
              </p>
            </div>

            {/* Inputs */}
            <div className="space-y-3">
              <input
                className="musa-input"
                placeholder="Nombre completo *"
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                autoComplete="name"
                required
              />
              <input
                className="musa-input"
                placeholder="Teléfono *"
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                autoComplete="tel"
                required
              />

              {/* Notifications opt-in */}
              <button
                type="button"
                onClick={() => setWantsNotifications((v) => !v)}
                className="w-full flex items-start gap-3 text-left group"
              >
                <div
                  className={cn(
                    "mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-colors",
                    wantsNotifications
                      ? "bg-primary border-primary"
                      : "border-border group-hover:border-primary-border"
                  )}
                >
                  {wantsNotifications && <CheckIcon className="w-3 h-3 text-white" />}
                </div>
                <div>
                  <p className="font-ui text-[13px] font-medium text-on-surface">
                    Quiero recibir recordatorios y ofertas
                  </p>
                  <p className="font-ui text-[12px] text-on-surface-muted mt-0.5 leading-snug">
                    Te avisaremos de confirmaciones y promos exclusivas de {professional.name}.
                  </p>
                </div>
              </button>

              {wantsNotifications && (
                <input
                  className="musa-input"
                  placeholder="Email (para confirmaciones)"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  autoComplete="email"
                />
              )}
            </div>
          </section>
        )}

        {/* ── CONFIRMED ─────────────────────────────────────────────── */}
        {step === "confirmed" && confirmed && (
          <div className="fixed inset-0 z-[100] bg-espresso-900/60 backdrop-blur-sm flex items-center justify-center p-5">
            <div className="bg-background border border-border-subtle rounded-2xl shadow-xl max-w-sm w-full p-8 text-center space-y-6">

              {/* Success mark */}
              <div className="w-14 h-14 rounded-full bg-success-surface flex items-center justify-center mx-auto">
                <CheckCircleIcon className="w-7 h-7 text-success" />
              </div>

              {/* Confirmation heading — emotional moment, font-light italic */}
              <div className="space-y-2">
                <h2
                  className="font-display font-light italic text-on-surface"
                  style={{ fontSize: "30px", letterSpacing: "-0.01em" }}
                >
                  Reserva confirmada.
                </h2>
                <p className="font-ui text-[14px] text-on-surface-muted leading-relaxed">
                  {professional.name} te espera el{" "}
                  {new Date(confirmed.startTime).toLocaleDateString("es-VE", {
                    day:   "numeric",
                    month: "long",
                  })}{" "}
                  a las {formatTimeES(confirmed.startTime)}.
                </p>
              </div>

              {/* Summary */}
              <div className="bg-surface-sunken rounded-xl p-4 text-left space-y-1">
                <span className="musa-sublabel block">Servicio</span>
                <p className="font-ui font-medium text-[15px] text-on-surface">
                  {confirmed.serviceName}
                </p>
              </div>

              {/* Push opt-in */}
              {wantsNotifications && !pushSubscribed && (
                <button
                  onClick={activatePush}
                  disabled={pushLoading}
                  className="w-full h-11 bg-primary-surface border border-primary-border text-primary font-ui font-medium text-[13px] rounded-full flex items-center justify-center gap-2 hover:bg-primary hover:text-on-primary transition-colors disabled:opacity-60"
                >
                  {pushLoading ? (
                    <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <BellAlertIcon className="w-4 h-4" />
                  )}
                  {pushLoading ? "Activando…" : "Activar notificaciones"}
                </button>
              )}

              {pushSubscribed && (
                <p className="font-ui text-[12px] text-success flex items-center justify-center gap-1.5">
                  <CheckCircleIcon className="w-4 h-4" />
                  Notificaciones activadas
                </p>
              )}

              <div className="space-y-2 pt-2">
                {confirmed.whatsapp && (
                  <a
                    href={`https://wa.me/${confirmed.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Hola ${professional.name}, acabo de reservar una cita para ${confirmed.serviceName}. ¡Nos vemos pronto!`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full h-12 bg-[#25D366] text-white font-ui font-medium text-[14px] rounded-full flex items-center justify-center gap-2.5 shadow-md hover:opacity-90 transition-opacity"
                  >
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                    </svg>
                    Confirmar por WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setStep("service");
                    setSelectedService(null);
                    setSelectedSlot(null);
                    setClientPhone("");
                    setClientEmail("");
                    setWantsNotifications(false);
                    setConfirmed(null);
                  }}
                  className="w-full h-12 bg-surface-sunken text-on-surface-muted font-ui font-medium text-[14px] rounded-full hover:bg-surface-raised transition-colors"
                >
                  Nueva reserva
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Bottom action bar ────────────────────────────────────────── */}
      {step !== "confirmed" && (
        <div className="fixed bottom-0 left-0 w-full glass-nav border-t border-border-subtle z-50 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))] pt-4">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              {step !== "service" && (
                <button
                  onClick={() => {
                    if (step === "datetime") setStep("service");
                    else if (step === "contact") setStep("datetime");
                  }}
                  className="flex items-center gap-1.5 font-ui text-[13px] font-medium text-on-surface-muted hover:text-on-surface transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Volver
                </button>
              )}
              {selectedService && step !== "service" && (
                <p
                  className="font-display font-normal text-on-surface mt-1"
                  style={{ fontSize: "22px", letterSpacing: "-0.02em" }}
                >
                  {formatCurrency(selectedService.price, selectedService.currency)}
                </p>
              )}
            </div>

            <button
              disabled={
                (step === "service"  && !selectedService) ||
                (step === "datetime" && !selectedSlot)    ||
                (step === "contact"  && (!clientName || !clientPhone)) ||
                booking
              }
              onClick={() => {
                if (step === "service"  && selectedService) setStep("datetime");
                else if (step === "datetime" && selectedSlot) setStep("contact");
                else if (step === "contact") handleBook();
              }}
              className="flex-1 max-w-[280px] h-12 bg-primary text-on-primary font-ui font-medium text-[14px] rounded-full shadow-primary-sm hover:bg-primary-hover transition-all active:scale-[0.97] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {booking ? (
                <div className="w-4 h-4 border border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {step === "service"
                    ? "Elegir fecha y hora"
                    : step === "datetime"
                    ? "Mis datos"
                    : "Reservar ahora"}
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
