"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  oldStartTime?: string;
  service: { name: string; durationMin: number; price: number; currency: string };
  client: { name: string; email?: string };
  user: { name: string; slug: string; whatsapp?: string };
}

interface Slot {
  time: string;
  isAvailable: boolean;
  isCurrent: boolean;
}

type View = "loading" | "main" | "reschedule" | "cancelled" | "rescheduled" | "not-found" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-VE", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

function statusLabel(status: string) {
  switch (status) {
    case "confirmed":
      return { text: "Confirmada", color: "bg-green-100 text-green-700" };
    case "reprogrammed":
      return { text: "Reprogramada", color: "bg-violet-100 text-violet-700" };
    case "pending":
      return { text: "Pendiente", color: "bg-yellow-100 text-yellow-700" };
    default:
      return { text: status, color: "bg-gray-100 text-gray-600" };
  }
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
      // Opcional: Redirigir después de 2 segundos para que vean el éxito
      if (view === "rescheduled") {
        setTimeout(() => router.push("/client"), 2500);
      }
    }
  };

  // El setView se hace en el try, pero para estar seguros de la redirección automática:
  useEffect(() => {
    if (view === "rescheduled") {
      const timer = setTimeout(() => {
        router.push("/client");
      }, 3000);
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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#f9f4fc' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: '#764797', borderTopColor: 'transparent' }} />
          <p className="text-gray-500 text-sm">Cargando tu cita...</p>
        </div>
      </div>
    );
  }

  if (view === "not-found") {
    return (
      <PortalShell>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Cita no encontrada</h2>
          <p className="text-gray-500 text-sm">
            El link puede haber expirado o la cita fue reprogramada (lo que genera un link nuevo).
          </p>
        </div>
      </PortalShell>
    );
  }

  if (view === "error") {
    return (
      <PortalShell>
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Error al cargar</h2>
          <p className="text-gray-500 text-sm">Intenta recargar la página.</p>
        </div>
      </PortalShell>
    );
  }

  if (view === "cancelled") {
    return (
      <PortalShell>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Cita cancelada</h2>
          {appointment && (
            <p className="text-gray-500 text-sm mb-6">
              Tu cita de <strong>{appointment.service.name}</strong> fue cancelada.
            </p>
          )}
          {appointment && (
            <a
              href={`/p/${appointment.user.slug}`}
              className="inline-block text-white px-6 py-3 rounded-full font-semibold text-sm transition-colors"
              style={{ backgroundColor: '#764797' }}
            >
              Reservar nueva cita
            </a>
          )}
        </div>
      </PortalShell>
    );
  }

  if (view === "rescheduled") {
    return (
      <PortalShell>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">✅</span>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">¡Cita reprogramada!</h2>
          {newAppointmentDate && (
            <div className="rounded-2xl p-4 my-4 text-left" style={{ backgroundColor: '#f4eaf9' }}>
              <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: '#764797' }}>Nueva fecha</p>
              <p className="font-bold text-gray-800">{fmtDate(newAppointmentDate)}</p>
              <p className="text-gray-600 text-sm">a las {fmtTime(newAppointmentDate)}</p>
            </div>
          )}
          <p className="text-gray-500 text-sm mb-6">
            Ambas partes recibieron una confirmación. ¡Gracias por avisar!
          </p>
          {newManageUrl && (
            <a
              href={newManageUrl}
              className="inline-block text-white px-6 py-3 rounded-full font-semibold text-sm transition-colors"
              style={{ backgroundColor: '#764797' }}
            >
              Gestionar nueva cita →
            </a>
          )}
        </div>
      </PortalShell>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────

  if (view === "main" && appointment) {
    const badge = statusLabel(appointment.status);
    return (
      <PortalShell>
        <div>
          {/* Appointment card */}
          <div className="rounded-2xl p-5 text-white mb-4" style={{ background: 'linear-gradient(135deg, #764797 0%, #9060b2 100%)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.7)' }}>
                Tu cita
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
                {badge.text}
              </span>
            </div>
            <h2 className="text-xl font-bold mb-1">{appointment.service.name}</h2>
            <p className="text-sm mb-3" style={{ color: 'rgba(255,255,255,0.7)' }}>con {appointment.user.name}</p>
            <div className="rounded-xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
              <p className="text-white font-semibold">{fmtDate(appointment.startTime)}</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>a las {fmtTime(appointment.startTime)}</p>
            </div>
            {appointment.oldStartTime && (
              <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Fecha anterior: {fmtDate(appointment.oldStartTime)} {fmtTime(appointment.oldStartTime)}
              </p>
            )}
          </div>

          {/* Service details */}
          <div className="bg-white rounded-2xl p-4 mb-4 border border-gray-100">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Duración</span>
              <span className="font-medium text-gray-800">{appointment.service.durationMin} min</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">Precio</span>
              <span className="font-medium text-gray-800">
                {appointment.service.currency} {appointment.service.price.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleOpenReschedule}
              className="w-full text-white font-semibold py-3.5 rounded-2xl transition-colors"
              style={{ backgroundColor: '#764797' }}
            >
              📅 Cambiar fecha
            </button>
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full bg-white hover:bg-gray-50 text-red-500 font-semibold py-3.5 rounded-2xl border border-red-100 transition-colors"
            >
              Cancelar cita
            </button>
            {appointment.user.whatsapp && (
              <a
                href={`https://wa.me/${appointment.user.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-2xl border border-gray-200 transition-colors"
              >
                <span>💬</span> Contactar por WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Cancel confirmation modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-2">¿Cancelar cita?</h3>
              <p className="text-gray-500 text-sm mb-6">
                Se notificará a <strong>{appointment.user.name}</strong> y el hueco quedará libre.
                Esta acción no se puede deshacer.
              </p>
              <div className="space-y-2">
                <button
                  onClick={handleCancel}
                  disabled={submitting}
                  className="w-full bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-semibold py-3 rounded-2xl transition-colors"
                >
                  {submitting ? "Cancelando..." : "Sí, cancelar cita"}
                </button>
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-2xl transition-colors"
                >
                  Volver
                </button>
              </div>
            </div>
          </div>
        )}
      </PortalShell>
    );
  }

  // ── Reschedule view ─────────────────────────────────────────────────────────

  if (view === "reschedule") {
    const grouped = groupByDay(slots);
    const days = Object.keys(grouped);

    return (
      <PortalShell>
        <div>
          <button
            onClick={() => setView("main")}
            className="flex items-center gap-1.5 text-sm font-medium mb-4"
            style={{ color: '#764797' }}
          >
            ← Volver
          </button>

          <h2 className="text-xl font-bold text-gray-800 mb-1">Elige nueva fecha</h2>
          <p className="text-gray-500 text-sm mb-5">
            Selecciona un hueco disponible en los próximos 14 días.
          </p>

          {loadingSlots && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#764797', borderTopColor: 'transparent' }} />
              <p className="text-gray-400 text-sm">Buscando huecos disponibles...</p>
            </div>
          )}

          {!loadingSlots && days.length === 0 && (
            <div className="text-center py-10">
              <div className="text-4xl mb-3">😕</div>
              <p className="text-gray-600 font-medium mb-1">Sin huecos disponibles</p>
              <p className="text-gray-400 text-sm">
                No hay espacios libres en los próximos 14 días. Contacta directamente a{" "}
                {appointment?.user.name}.
              </p>
              {appointment?.user.whatsapp && (
                <a
                  href={`https://wa.me/${appointment.user.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mt-4 bg-green-500 text-white px-5 py-2.5 rounded-full text-sm font-semibold"
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
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {day}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {grouped[day].map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => slot.isAvailable && !slot.isCurrent && setSelectedSlot(slot.time)}
                        disabled={!slot.isAvailable || slot.isCurrent}
                        style={slot.isCurrent
                          ? { backgroundColor: '#f4eaf9', color: '#764797', borderColor: '#c89ee0' }
                          : selectedSlot === slot.time
                            ? { backgroundColor: '#764797', color: '#ffffff', borderColor: '#764797' }
                            : !slot.isAvailable
                              ? { backgroundColor: '#fff1f1', color: '#f8aaaa', borderColor: '#fecaca' }
                              : {}}
                        className={`relative py-3.5 rounded-2xl text-sm font-bold transition-all border flex flex-col items-center justify-center gap-1 group ${
                          slot.isCurrent
                            ? "cursor-not-allowed shadow-none"
                            : !slot.isAvailable
                              ? "cursor-not-allowed"
                              : selectedSlot === slot.time
                                ? "shadow-lg scale-105 z-10"
                                : "bg-white text-gray-700 border-gray-100 hover:scale-[1.02]"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          {slot.isCurrent ? (
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#764797' }} />
                          ) : !slot.isAvailable ? (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedSlot === slot.time ? '#ffffff' : '#22c55e' }} />
                          )}
                          {fmtTime(slot.time)}
                        </span>
                        {slot.isCurrent ? (
                          <span className="text-[9px] uppercase tracking-tighter font-black">Tu cita</span>
                        ) : !slot.isAvailable ? (
                          <span className="text-[9px] uppercase tracking-tighter opacity-50">Ocupado</span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-tighter opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: '#764797' }}>Libre</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fixed confirm bar */}
          {selectedSlot && (
            <div className="fixed bottom-[70px] left-0 right-0 bg-white/95 backdrop-blur-md border-t border-violet-100 p-4 z-[60] shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">

              <div className="max-w-sm mx-auto">
                <p className="text-center text-sm text-gray-500 mb-3">
                  Nueva cita:{" "}
                  <strong className="text-gray-800">
                    {fmtDate(selectedSlot)} a las {fmtTime(selectedSlot)}
                  </strong>
                </p>
                <button
                  onClick={handleConfirmReschedule}
                  disabled={submitting || !appointment || selectedSlot === appointment.startTime}
                  className="w-full disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-colors"
                  style={{ backgroundColor: '#764797' }}
                >
                  {submitting 
                    ? "Confirmando..." 
                    : selectedSlot === appointment?.startTime 
                      ? "Selecciona otro horario" 
                      : "✅ Confirmar nueva fecha"}
                </button>
              </div>
            </div>
          )}
        </div>
      </PortalShell>
    );
  }

  return null;
}

// ── Layout shell ──────────────────────────────────────────────────────────────

function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#f9f4fc' }}>
      {/* Header */}
      <div className="px-4 py-5" style={{ background: 'linear-gradient(135deg, #764797 0%, #9060b2 100%)' }}>
        <div className="max-w-sm mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-1.5 hover:text-white transition-colors text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Inicio
          </a>
          <div className="text-center">
            <h1 className="text-white text-lg font-bold tracking-tight">Musa ✨</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>Gestiona tu cita</p>
          </div>
          <a href="/client/login" className="hover:text-white transition-colors text-xs font-medium" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Mi cuenta
          </a>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto px-4 py-6">{children}</div>

      {/* Footer nav */}
      <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-xl border-t border-violet-100 px-4 py-3 flex justify-around z-[70]">
        <a href="/" className="flex flex-col items-center gap-0.5 text-gray-400 transition-colors" style={{ '--hover-color': '#764797' } as React.CSSProperties}
           onMouseEnter={e => (e.currentTarget.style.color='#764797')} onMouseLeave={e => (e.currentTarget.style.color='')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wide">Inicio</span>
        </a>
        <a href="/explore" className="flex flex-col items-center gap-0.5 text-gray-400 transition-colors"
           onMouseEnter={e => (e.currentTarget.style.color='#764797')} onMouseLeave={e => (e.currentTarget.style.color='')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wide">Explorar</span>
        </a>
        <a href="/client" className="flex flex-col items-center gap-0.5 text-gray-400 transition-colors"
           onMouseEnter={e => (e.currentTarget.style.color='#764797')} onMouseLeave={e => (e.currentTarget.style.color='')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wide">Mis Citas</span>
        </a>
        <a href="/" className="flex flex-col items-center gap-0.5 text-gray-400 transition-colors"
           onMouseEnter={e => (e.currentTarget.style.color='#764797')} onMouseLeave={e => (e.currentTarget.style.color='')}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wide">Salir</span>
        </a>
      </div>
    </div>
  );
}
