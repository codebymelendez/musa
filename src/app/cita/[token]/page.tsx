"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import QRDisplay from "@/components/loyalty/QRDisplay";
import { formatPrice } from "@/lib/currency";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LoyaltyInfo {
  program: {
    name: string;
    accumulationType: string;
    pointsPerVisit: number;
    rewardThreshold: number;
    rewardDescription: string;
  };
  account: { totalPoints: number; qrToken: string } | null;
}

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  oldStartTime?: string;
  service: { name: string; durationMin: number; price: number; currency: string };
  client: { name: string; email?: string };
  loyalty?: LoyaltyInfo | null;
  user: {
    name: string;
    slug: string;
    whatsapp?: string;
    avatarUrl?: string;
    business?: { name: string | null; city: string | null; currency?: string | null } | null;
  };
}

interface Slot {
  time: string;
  isAvailable: boolean;
  isCurrent: boolean;
}

type View = "loading" | "main" | "reschedule" | "cancelled" | "rescheduled" | "not-found" | "error" | "expired";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function fmtDateShort(iso: string) {
  return new Date(iso).toLocaleDateString("es-VE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-VE", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function groupByDay(slots: Slot[]): Record<string, Slot[]> {
  const groups: Record<string, Slot[]> = {};
  for (const slot of slots) {
    const key = new Date(slot.time).toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(slot);
  }
  return groups;
}

// Genera y descarga un archivo .ics para añadir al calendario
function downloadICS(appointment: Appointment) {
  const start = new Date(appointment.startTime);
  const end = new Date(appointment.endTime);

  const pad = (n: number) => String(n).padStart(2, "0");
  const toICSDate = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

  const location = appointment.user.business?.city ?? "Venezuela";
  const summary = `${appointment.service.name} con ${appointment.user.name}`;
  const description = `Cita en MUSA – ${appointment.service.name} (${appointment.service.durationMin} min) con ${appointment.user.name}`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MUSA//getmusa.app//ES",
    "BEGIN:VEVENT",
    `UID:${appointment.id}@getmusa.app`,
    `DTSTART:${toICSDate(start)}`,
    `DTEND:${toICSDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `cita-musa-${appointment.id.slice(0, 8)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CitaPortalPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [view, setView] = useState<View>("loading");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [newManageUrl, setNewManageUrl] = useState<string | null>(null);
  const [newAppointmentDate, setNewAppointmentDate] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  // Fetch appointment on mount
  useEffect(() => {
    if (!token) return;
    fetch(`/api/appointments/by-token/${token}`)
      .then((r) => {
        if (r.status === 404) { setView("not-found"); return null; }
        if (r.status === 410) { setView("expired"); return null; }
        if (!r.ok) { setView("error"); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.status === "cancelled") {
          setAppointment(data);
          setView("cancelled");
        } else {
          setAppointment(data);
          setView("main");
        }
      })
      .catch(() => setView("error"));
  }, [token]);

  // Load available slots
  const loadSlots = useCallback(async () => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/appointments/by-token/${token}/slots`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [token]);

  const handleOpenReschedule = () => {
    setView("reschedule");
    loadSlots();
  };

  const handleConfirmReschedule = async () => {
    if (!selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newStartTime: selectedSlot }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Error al reprogramar");
        return;
      }
      setNewManageUrl(data.newManageUrl);
      setNewAppointmentDate(selectedSlot);
      setView("rescheduled");
    } catch {
      alert("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  // Redirección automática tras reprogramar
  useEffect(() => {
    if (view === "rescheduled") {
      const timer = setTimeout(() => {
        router.push("/client");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [view, router]);

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/appointments/by-token/${token}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "Error al cancelar");
        return;
      }
      setView("cancelled");
    } catch {
      alert("Error de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
      setShowCancelConfirm(false);
    }
  };

  // ── Render states ───────────────────────────────────────────────────────────

  if (view === "loading") {
    return (
      <Shell>
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="font-ui text-[13px] text-on-surface-muted">Cargando tu cita…</p>
        </div>
      </Shell>
    );
  }

  if (view === "not-found") {
    return (
      <Shell>
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">🔍</div>
          <h2 className="font-display font-normal text-on-surface text-[22px]">Cita no encontrada</h2>
          <p className="font-ui text-[13px] text-on-surface-muted max-w-xs mx-auto leading-relaxed">
            El enlace puede haber expirado o la cita fue reprogramada (lo que genera un enlace nuevo).
          </p>
          <Link href="/" className="inline-flex items-center gap-1.5 font-ui text-[13px] font-medium text-primary hover:underline mt-2">
            Ir al inicio →
          </Link>
        </div>
      </Shell>
    );
  }

  if (view === "expired") {
    return (
      <Shell>
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">⏰</div>
          <h2 className="font-display font-normal text-on-surface text-[22px]">Enlace expirado</h2>
          <p className="font-ui text-[13px] text-on-surface-muted max-w-xs mx-auto leading-relaxed">
            Este enlace expiró 24 horas después de la cita. Para ver tu historial, accede a tu área de clientas.
          </p>
          <Link href="/client" className="inline-flex items-center gap-1.5 font-ui text-[13px] font-medium text-primary hover:underline mt-2">
            Mis citas →
          </Link>
        </div>
      </Shell>
    );
  }

  if (view === "error") {
    return (
      <Shell>
        <div className="text-center py-12 space-y-3">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-display font-normal text-on-surface text-[22px]">Error al cargar</h2>
          <p className="font-ui text-[13px] text-on-surface-muted">Intenta recargar la página.</p>
        </div>
      </Shell>
    );
  }

  if (view === "cancelled") {
    return (
      <Shell>
        <div className="text-center py-8 space-y-5">
          {/* Professional */}
          {appointment && (
            <div className="flex flex-col items-center gap-3">
              <ProfessionalAvatar
                name={appointment.user.name}
                avatarUrl={appointment.user.avatarUrl}
                size={56}
              />
              <p className="font-ui font-medium text-[14px] text-on-surface">{appointment.user.name}</p>
            </div>
          )}
          <div className="w-14 h-14 bg-surface-sunken rounded-full flex items-center justify-center mx-auto border border-border-subtle">
            <span className="text-2xl">❌</span>
          </div>
          <div>
            <h2 className="font-display font-normal text-on-surface text-[24px] mb-1">Cita cancelada</h2>
            {appointment && (
              <p className="font-ui text-[13px] text-on-surface-muted">
                Tu cita de <strong>{appointment.service.name}</strong> fue cancelada.
              </p>
            )}
          </div>
          {appointment && (
            /* DEPRECATED: User.slug legacy — el canónico es Business.slug (redirige vía SlugHistory) */
            <Link
              href={`/p/${appointment.user.slug}`}
              className="inline-flex items-center gap-2 font-ui text-[14px] font-medium px-6 py-3 rounded-full bg-primary text-on-primary shadow-primary-sm hover:bg-primary-hover transition-colors"
            >
              Reservar nueva cita →
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  if (view === "rescheduled") {
    return (
      <Shell>
        <div className="text-center py-8 space-y-5">
          <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <span className="text-2xl">✅</span>
          </div>
          <div>
            <h2 className="font-display font-normal text-on-surface text-[24px] mb-1">¡Cita reprogramada!</h2>
            {newAppointmentDate && (
              <div className="rounded-2xl p-4 my-4 text-left bg-surface-tinted border border-primary-border/30">
                <p className="font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-primary-muted mb-1">Nueva fecha</p>
                <p className="font-ui font-medium text-[15px] text-on-surface">{fmtDate(newAppointmentDate)}</p>
                <p className="font-ui text-[13px] text-on-surface-muted">a las {fmtTime(newAppointmentDate)}</p>
              </div>
            )}
            <p className="font-ui text-[13px] text-on-surface-muted">
              Ambas partes recibieron una confirmación. ¡Gracias por avisar!
            </p>
          </div>
          {newManageUrl && (
            <Link
              href={newManageUrl}
              className="inline-flex items-center gap-2 font-ui text-[14px] font-medium px-6 py-3 rounded-full bg-primary text-on-primary shadow-primary-sm hover:bg-primary-hover transition-colors"
            >
              Gestionar nueva cita →
            </Link>
          )}
        </div>
      </Shell>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────

  if (view === "main" && appointment) {
    const isPast = new Date(appointment.endTime) < new Date();
    const canModify = !isPast && !["cancelled", "completed", "no_show"].includes(appointment.status);
    const location = appointment.user.business?.city ?? null;

    return (
      <Shell>
        <div className="space-y-4">
          {/* Professional card */}
          <div className="bg-surface-raised border border-border-subtle rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-4">
              <ProfessionalAvatar
                name={appointment.user.name}
                avatarUrl={appointment.user.avatarUrl}
                size={52}
              />
              <div className="flex-1 min-w-0">
                <p className="font-ui font-medium text-[15px] text-on-surface truncate">
                  {appointment.user.name}
                </p>
                {(appointment.user.business?.name || location) && (
                  <p className="font-ui text-[12px] text-on-surface-muted truncate">
                    {appointment.user.business?.name ?? ""}
                    {location && <span className="text-on-surface-subtle"> · {location}</span>}
                  </p>
                )}
              </div>
              <StatusBadge status={appointment.status} />
            </div>

            {/* Divider */}
            <div className="h-px bg-border-subtle" />

            {/* Appointment details */}
            <div className="space-y-3">
              <DetailRow icon="✂️" label="Servicio" value={appointment.service.name} />
              <DetailRow
                icon="📅"
                label="Fecha"
                value={`${fmtDate(appointment.startTime)}, ${fmtTime(appointment.startTime)}`}
              />
              <DetailRow icon="⏱️" label="Duración" value={`${appointment.service.durationMin} min`} />
              <DetailRow
                icon="💵"
                label="Precio"
                value={formatPrice(
                  appointment.service.price,
                  appointment.user.business?.currency ?? appointment.service.currency
                )}
              />
              {location && (
                <DetailRow icon="📍" label="Ubicación" value={location} />
              )}
            </div>
          </div>

          {/* Fidelización */}
          {appointment.loyalty && (
            <LoyaltySection
              loyalty={appointment.loyalty}
              businessName={appointment.user.business?.name ?? appointment.user.name}
            />
          )}

          {/* Action buttons */}
          {canModify && (
            <div className="space-y-2.5">
              <button
                onClick={() => downloadICS(appointment)}
                className="w-full h-11 bg-surface-raised border border-border-subtle rounded-full font-ui font-medium text-[14px] text-on-surface hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2"
              >
                🗓️ Agregar al calendario
              </button>
              <button
                onClick={handleOpenReschedule}
                className="w-full h-11 bg-surface-raised border border-border-subtle rounded-full font-ui font-medium text-[14px] text-on-surface hover:bg-surface-container-high transition-colors"
              >
                📅 Cambiar fecha
              </button>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="w-full h-11 bg-surface-raised border border-error/20 rounded-full font-ui font-medium text-[14px] text-error hover:bg-error-surface/40 transition-colors"
              >
                Cancelar cita
              </button>
              {appointment.user.whatsapp && (
                <a
                  href={`https://wa.me/${appointment.user.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full h-11 bg-[#25D366]/10 border border-[#25D366]/20 rounded-full font-ui font-medium text-[14px] text-[#25D366] hover:bg-[#25D366]/20 transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Contactar por WhatsApp
                </a>
              )}
            </div>
          )}

          {/* Past appointment — only offer rebooking */}
          {!canModify && appointment.status !== "cancelled" && (
            <div className="space-y-2.5">
              {canModify === false && (
                <div className="text-center py-3">
                  <p className="font-ui text-[13px] text-on-surface-subtle">Esta cita ya no se puede modificar.</p>
                </div>
              )}
              {/* DEPRECATED: User.slug legacy — el canónico es Business.slug (redirige vía SlugHistory) */}
              <Link
                href={`/p/${appointment.user.slug}`}
                className="w-full h-11 bg-primary rounded-full font-ui font-medium text-[14px] text-on-primary flex items-center justify-center gap-2 shadow-primary-sm hover:bg-primary-hover transition-colors"
              >
                Reservar nueva cita →
              </Link>
            </div>
          )}
        </div>

        {/* Cancel confirmation modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-surface-raised border border-border-subtle rounded-3xl p-6 w-full max-w-sm shadow-xl">
              <h3 className="font-display font-normal text-on-surface text-[20px] mb-2">¿Cancelar cita?</h3>
              <p className="font-ui text-[13px] text-on-surface-muted mb-6 leading-relaxed">
                Se notificará a <strong>{appointment.user.name}</strong> y el hueco quedará libre.
                Esta acción no se puede deshacer.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleCancel}
                  disabled={submitting}
                  className="w-full h-11 bg-error/90 hover:bg-error text-white font-ui font-medium text-[14px] rounded-full transition-colors disabled:opacity-50"
                >
                  {submitting ? "Cancelando…" : "Sí, cancelar cita"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full h-11 bg-surface-container text-on-surface font-ui font-medium text-[14px] rounded-full hover:bg-surface-container-high transition-colors"
                >
                  Volver
                </button>
              </div>
            </div>
          </div>
        )}
      </Shell>
    );
  }

  // ── Reschedule view ─────────────────────────────────────────────────────────

  if (view === "reschedule") {
    const grouped = groupByDay(slots);
    const days = Object.keys(grouped);

    return (
      <Shell>
        <div>
          <button
            onClick={() => setView("main")}
            className="flex items-center gap-1.5 font-ui text-[13px] font-medium text-primary mb-5"
          >
            ← Volver
          </button>

          <h2 className="font-display font-normal text-on-surface text-[22px] mb-1">Elige nueva fecha</h2>
          <p className="font-ui text-[13px] text-on-surface-muted mb-5">
            Selecciona un hueco disponible en los próximos 14 días.
          </p>

          {loadingSlots && (
            <div className="text-center py-10 space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="font-ui text-[13px] text-on-surface-muted">Buscando huecos disponibles…</p>
            </div>
          )}

          {!loadingSlots && days.length === 0 && (
            <div className="text-center py-10 space-y-3">
              <div className="text-4xl">😕</div>
              <p className="font-ui font-medium text-on-surface text-[14px]">Sin huecos disponibles</p>
              <p className="font-ui text-[13px] text-on-surface-muted max-w-xs mx-auto">
                No hay espacios libres en los próximos 14 días.
                {appointment?.user.whatsapp && " Contacta directamente a " + appointment.user.name + "."}
              </p>
              {appointment?.user.whatsapp && (
                <a
                  href={`https://wa.me/${appointment.user.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-ui text-[13px] font-medium text-[#25D366]"
                >
                  💬 WhatsApp
                </a>
              )}
            </div>
          )}

          {!loadingSlots && days.length > 0 && (
            <div className="space-y-5 pb-32">
              {days.map((day) => (
                <div key={day}>
                  <p className="font-ui text-[11px] font-medium uppercase tracking-[0.08em] text-on-surface-subtle mb-2">
                    {day}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {grouped[day].map((slot) => {
                      const isSel = selectedSlot === slot.time;
                      const isCur = slot.isCurrent;
                      const isUnavail = !slot.isAvailable;
                      return (
                        <button
                          key={slot.time}
                          onClick={() => slot.isAvailable && !isCur && setSelectedSlot(slot.time)}
                          disabled={isUnavail || isCur}
                          className={`py-3.5 rounded-2xl text-[13px] font-medium transition-all border flex flex-col items-center gap-1 ${
                            isCur
                              ? "border-primary/30 bg-primary/5 text-primary cursor-not-allowed"
                              : isSel
                                ? "border-primary bg-primary text-on-primary shadow-primary-sm scale-105"
                                : isUnavail
                                  ? "border-border-subtle bg-surface-sunken text-on-surface-subtle cursor-not-allowed"
                                  : "border-border-subtle bg-surface-raised text-on-surface hover:border-primary/40 hover:scale-[1.02]"
                          }`}
                        >
                          <span>{fmtTime(slot.time)}</span>
                          <span className="text-[9px] uppercase tracking-wider opacity-60">
                            {isCur ? "Tu cita" : isUnavail ? "Ocupado" : "Libre"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fixed confirm bar */}
          {selectedSlot && (
            <div className="fixed bottom-[68px] left-0 right-0 bg-surface-raised/95 backdrop-blur-md border-t border-border-subtle p-4 z-[60]">
              <div className="max-w-sm mx-auto">
                <p className="font-ui text-[13px] text-on-surface-muted text-center mb-3">
                  Nueva cita:{" "}
                  <strong className="text-on-surface">
                    {fmtDateShort(selectedSlot)} a las {fmtTime(selectedSlot)}
                  </strong>
                </p>
                <button
                  onClick={handleConfirmReschedule}
                  disabled={submitting || !appointment || selectedSlot === appointment.startTime}
                  className="w-full h-11 bg-primary text-on-primary font-ui font-medium text-[14px] rounded-full shadow-primary-sm transition-colors hover:bg-primary-hover disabled:opacity-50"
                >
                  {submitting
                    ? "Confirmando…"
                    : selectedSlot === appointment?.startTime
                      ? "Selecciona otro horario"
                      : "✅ Confirmar nueva fecha"}
                </button>
              </div>
            </div>
          )}
        </div>
      </Shell>
    );
  }

  return null;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoyaltySection({ loyalty, businessName }: { loyalty: LoyaltyInfo; businessName: string }) {
  const { program, account } = loyalty;
  const threshold = program.rewardThreshold;
  const unit = program.accumulationType === "visits" ? "visitas" : "puntos";

  // Programa activo pero la clienta aún no tiene cuenta
  if (!account) {
    return (
      <div className="bg-surface-raised border border-border-subtle rounded-2xl p-5 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">⭐</span>
          <p className="font-ui font-medium text-[14px] text-on-surface">{program.name}</p>
        </div>
        <p className="font-ui text-[13px] text-on-surface-muted leading-relaxed">
          ¡Suma puntos con cada visita! Con {threshold} {unit} en {businessName} obtienes:{" "}
          <strong className="text-on-surface">{program.rewardDescription}</strong>.
        </p>
      </div>
    );
  }

  const progress = Math.min((account.totalPoints / threshold) * 100, 100);
  const canRedeem = account.totalPoints >= threshold;

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-2xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-ui font-medium text-[14px] text-on-surface">{program.name}</p>
          <p className="font-ui text-[12px] text-on-surface-muted">{businessName}</p>
        </div>
        {canRedeem && (
          <span className="font-ui text-[10px] font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex-shrink-0">
            ¡Recompensa lista!
          </span>
        )}
      </div>

      {/* Progreso */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-end">
          <span className="font-display font-normal text-[30px] leading-none text-on-surface">
            {account.totalPoints}
          </span>
          <span className="font-ui text-[12px] text-on-surface-muted mb-0.5">/ {threshold} {unit}</span>
        </div>
        <div className="h-2 bg-surface-sunken rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${canRedeem ? "bg-green-500" : "bg-primary"}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="font-ui text-[12px] text-on-surface-muted">
          {canRedeem
            ? `Puedes canjear: ${program.rewardDescription}`
            : `Te faltan ${threshold - account.totalPoints} ${unit} para: ${program.rewardDescription}`}
        </p>
      </div>

      {/* QR */}
      <div className="pt-1 space-y-3">
        <div className="flex justify-center">
          <QRDisplay token={account.qrToken} size={170} />
        </div>
        <p className="font-ui text-[12px] text-on-surface-muted text-center leading-relaxed">
          Muestra este código en <strong>{businessName}</strong> para sumar o canjear.
        </p>
      </div>
    </div>
  );
}

function ProfessionalAvatar({
  name,
  avatarUrl,
  size = 48,
}: {
  name: string;
  avatarUrl?: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden flex-shrink-0 bg-surface-container border border-border-subtle relative"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-lg font-medium text-on-surface-muted">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-[16px] flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-ui text-[11px] text-on-surface-subtle uppercase tracking-[0.06em] mb-0.5">{label}</p>
        <p className="font-ui text-[14px] text-on-surface leading-snug">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, { text: string; cls: string }> = {
    confirmed:    { text: "Confirmada",    cls: "bg-green-100 text-green-700" },
    reprogrammed: { text: "Reprogramada",  cls: "bg-violet-100 text-violet-700" },
    pending:      { text: "Pendiente",     cls: "bg-yellow-100 text-yellow-700" },
    cancelled:    { text: "Cancelada",     cls: "bg-red-100 text-red-600" },
    completed:    { text: "Completada",    cls: "bg-surface-container text-on-surface-variant" },
  };
  const meta = labels[status] ?? { text: status, cls: "bg-surface-container text-on-surface-muted" };
  return (
    <span className={`font-ui text-[11px] font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${meta.cls}`}>
      {meta.text}
    </span>
  );
}

// ── Layout shell ──────────────────────────────────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background font-ui antialiased pb-24">
      {/* Header */}
      <header className="glass-nav border-b border-border-subtle px-5 py-4">
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-ui text-[13px] text-on-surface-muted hover:text-on-surface transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            Inicio
          </Link>
          <div className="text-center">
            <p className="font-display font-normal text-on-surface text-[17px]" style={{ letterSpacing: "-0.01em" }}>
              Musa
            </p>
            <p className="font-ui text-[10px] text-on-surface-subtle -mt-0.5">Gestiona tu cita</p>
          </div>
          <Link
            href="/client"
            className="font-ui text-[13px] text-on-surface-muted hover:text-on-surface transition-colors"
          >
            Mi cuenta
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-sm mx-auto px-4 py-6">{children}</main>

      {/* Footer nav */}
      <nav className="fixed bottom-0 left-0 w-full bg-surface-raised/90 backdrop-blur-xl border-t border-border-subtle px-4 py-3 flex justify-around z-[70]">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-on-surface-subtle hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="font-ui text-[10px] font-medium uppercase tracking-wide">Inicio</span>
        </Link>
        <Link href="/explore" className="flex flex-col items-center gap-0.5 text-on-surface-subtle hover:text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="font-ui text-[10px] font-medium uppercase tracking-wide">Explorar</span>
        </Link>
        <Link href="/client" className="flex flex-col items-center gap-0.5 text-primary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="font-ui text-[10px] font-medium uppercase tracking-wide">Mis Citas</span>
        </Link>
      </nav>
    </div>
  );
}
