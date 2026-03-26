"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { formatTimeES, formatDateES, formatCurrency, statusLabel } from "@/lib/utils";
import { useAppointments } from "@/hooks/useAppointments";
import { Appointment } from "@/types";

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { updateStatus } = useAppointments();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/appointments/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("No se pudo cargar la cita");
        return res.json();
      })
      .then((data) => setAppointment(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="material-symbols-outlined text-primary animate-spin text-3xl">progress_activity</span>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-error text-5xl mb-4">error</span>
        <h1 className="text-xl font-bold text-on-surface mb-2">Error</h1>
        <p className="text-on-surface-variant mb-6">{error || "Cita no encontrada"}</p>
        <Link href="/appointments" className="text-primary font-bold hover:underline">Volver a mis citas</Link>
      </div>
    );
  }

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      await updateStatus(appointment.id, newStatus as any);
      setAppointment({ ...appointment, status: newStatus as any });
    } catch (err) {
      alert("Error al actualizar el estado");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg px-6 py-4 flex items-center gap-3 shadow-sm shadow-purple-500/5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-purple-50 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="font-headline text-lg font-bold text-on-surface">Detalle de Cita</h1>
        </div>
      </header>

      <main className="px-6 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Client Card */}
        <section className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {appointment.client?.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-on-surface">{appointment.client?.name}</h2>
              <p className="text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">call</span>
                {appointment.client?.phone}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <a 
              href={`tel:${appointment.client?.phone}`}
              className="flex items-center justify-center gap-2 py-3 bg-surface-container-low rounded-2xl text-sm font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-lg">call</span>
              Llamar
            </a>
            <a 
              href={`https://wa.me/${appointment.client?.phone.replace(/\D/g, "")}`}
              target="_blank"
              className="flex items-center justify-center gap-2 py-3 bg-green-50 rounded-2xl text-sm font-bold text-green-700 hover:bg-green-100 transition-colors"
            >
              <span className="material-symbols-outlined text-lg text-green-600">message</span>
              WhatsApp
            </a>
          </div>
        </section>

        {/* Appointment Info */}
        <section className="space-y-4">
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-on-surface">Información del servicio</h3>
              <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase ${
                appointment.status === "completed" ? "bg-tertiary/10 text-tertiary" : 
                appointment.status === "cancelled" || appointment.status === "no_show" ? "bg-error/10 text-error" : 
                "bg-primary/10 text-primary"
              }`}>
                {statusLabel(appointment.status)}
              </span>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">content_cut</span>
                <div>
                  <p className="text-sm font-bold text-on-surface">{appointment.service?.name}</p>
                  <p className="text-xs text-on-surface-variant">{appointment.service?.durationMin} min · {formatCurrency(appointment.service?.price ?? 0)}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary">calendar_today</span>
                <div>
                  <p className="text-sm font-bold text-on-surface">{formatDateES(new Date(appointment.startTime))}</p>
                  <p className="text-xs text-on-surface-variant">De {formatTimeES(appointment.startTime)} a {formatTimeES(appointment.endTime)}</p>
                </div>
              </div>

              {appointment.notes && (
                <div className="bg-surface-container-low p-4 rounded-2xl mt-4">
                  <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1 opacity-70">Notas</p>
                  <p className="text-sm text-on-surface italic">{appointment.notes}</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="space-y-3 pt-4">
          {appointment.status !== "completed" && appointment.status !== "cancelled" && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleStatusUpdate("completed")}
                className="py-4 bg-tertiary text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-tertiary/20"
              >
                <span className="material-symbols-outlined">check_circle</span>
                Completada
              </button>
              <button
                onClick={() => handleStatusUpdate("no_show")}
                className="py-4 bg-error-container text-on-error-container rounded-2xl font-bold flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">person_off</span>
                No-show
              </button>
            </div>
          )}

          {appointment.status !== "cancelled" && appointment.status !== "completed" && (
            <button
              onClick={() => handleStatusUpdate("cancelled")}
              className="w-full py-4 text-error font-bold flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">cancel</span>
              Cancelar cita
            </button>
          )}
        </section>
      </main>
    </div>
  );
}
