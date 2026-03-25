"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";

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

function groupByDay(slots: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const iso of slots) {
    const key = new Date(iso).toLocaleDateString("es-VE", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(iso);
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

  const [view, setView] = useState<View>("loading");
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
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
    }
  };

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
      <div className="min-h-screen bg-violet-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
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
              className="inline-block bg-violet-600 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-violet-700 transition-colors"
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
            <div className="bg-violet-50 rounded-2xl p-4 my-4 text-left">
              <p className="text-violet-700 text-xs font-semibold uppercase tracking-wide mb-1">Nueva fecha</p>
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
              className="inline-block bg-violet-600 text-white px-6 py-3 rounded-full font-semibold text-sm hover:bg-violet-700 transition-colors"
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
          <div className="bg-gradient-to-br from-violet-600 to-purple-500 rounded-2xl p-5 text-white mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-violet-200 text-xs font-medium uppercase tracking-wide">
                Tu cita
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.color}`}>
                {badge.text}
              </span>
            </div>
            <h2 className="text-xl font-bold mb-1">{appointment.service.name}</h2>
            <p className="text-violet-200 text-sm mb-3">con {appointment.user.name}</p>
            <div className="bg-white/10 rounded-xl px-4 py-3">
              <p className="text-white font-semibold">{fmtDate(appointment.startTime)}</p>
              <p className="text-violet-200 text-sm">a las {fmtTime(appointment.startTime)}</p>
            </div>
            {appointment.oldStartTime && (
              <p className="text-violet-300 text-xs mt-2">
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
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3.5 rounded-2xl transition-colors"
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
            className="flex items-center gap-1.5 text-violet-600 text-sm font-medium mb-4"
          >
            ← Volver
          </button>

          <h2 className="text-xl font-bold text-gray-800 mb-1">Elige nueva fecha</h2>
          <p className="text-gray-500 text-sm mb-5">
            Selecciona un hueco disponible en los próximos 14 días.
          </p>

          {loadingSlots && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
                    {grouped[day].map((iso) => (
                      <button
                        key={iso}
                        onClick={() => setSelectedSlot(iso)}
                        className={`py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                          selectedSlot === iso
                            ? "bg-violet-600 text-white border-violet-600 shadow-md scale-105"
                            : "bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:text-violet-600"
                        }`}
                      >
                        🟢 {fmtTime(iso)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Fixed confirm bar */}
          {selectedSlot && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 z-40">
              <div className="max-w-sm mx-auto">
                <p className="text-center text-sm text-gray-500 mb-3">
                  Nueva cita:{" "}
                  <strong className="text-gray-800">
                    {fmtDate(selectedSlot)} a las {fmtTime(selectedSlot)}
                  </strong>
                </p>
                <button
                  onClick={handleConfirmReschedule}
                  disabled={submitting}
                  className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-colors"
                >
                  {submitting ? "Confirmando..." : "✅ Confirmar nueva fecha"}
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
    <div className="min-h-screen bg-violet-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-700 to-purple-600 px-4 py-5 text-center">
        <h1 className="text-white text-xl font-bold tracking-tight">Musa ✨</h1>
        <p className="text-violet-300 text-xs mt-0.5">Gestiona tu cita</p>
      </div>

      {/* Content */}
      <div className="max-w-sm mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
