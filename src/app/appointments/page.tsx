"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useAppointments } from "@/hooks/useAppointments";
import { Appointment } from "@/types";
import { formatTimeES, formatDateES, statusLabel } from "@/lib/utils";

export default function AppointmentsPage() {
  const { appointments, loading, fetchByRange } = useAppointments();
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  const loadAppointments = useCallback(async () => {
    // Cargar citas desde hoy hasta el futuro (30 días)
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 30);
    await fetchByRange(now.toISOString(), future.toISOString());
  }, [fetchByRange]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const filteredAppointments = appointments.filter((apt) => {
    if (filter === "pending") {
      return apt.status === "confirmed" || apt.status === "pending";
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg px-6 py-4 flex items-center gap-3 shadow-sm shadow-purple-500/5">
        <Link
          href="/home"
          className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-purple-50 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </Link>
        <div className="flex-1">
          <h1 className="font-headline text-lg font-bold text-on-surface">Mis Citas</h1>
          <p className="text-xs text-on-surface-variant">Próximos 30 días</p>
        </div>
      </header>

      <main className="px-6 pt-6 max-w-2xl mx-auto space-y-6">
        {/* Filtros */}
        <div className="flex bg-surface-container-low p-1 rounded-xl w-full">
          <button
            onClick={() => setFilter("pending")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "pending"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
              filter === "all"
                ? "bg-white text-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Todas
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined text-primary animate-spin text-3xl">
              progress_activity
            </span>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-20 text-on-surface-variant">
            <span className="material-symbols-outlined text-5xl mb-4 opacity-20">
              event_busy
            </span>
            <p className="font-bold">No hay citas {filter === "pending" ? "pendientes" : ""}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/10"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-0.5">
                      {formatDateES(new Date(apt.startTime))} · {formatTimeES(apt.startTime)}
                    </span>
                    <h3 className="text-lg font-bold text-on-surface">
                      {apt.client?.name}
                    </h3>
                    <p className="text-on-surface-variant text-sm">
                      {apt.service?.name}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${
                      apt.status === "completed"
                        ? "bg-tertiary/10 text-tertiary"
                        : apt.status === "cancelled" || apt.status === "no_show"
                        ? "bg-error/10 text-error"
                        : "bg-surface-container text-on-surface-variant"
                    }`}
                  >
                    {statusLabel(apt.status)}
                  </span>
                </div>
                
                {apt.notes && (
                  <div className="mt-3 p-3 bg-surface-container-low rounded-xl text-xs text-on-surface-variant italic">
                    "{apt.notes}"
                  </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Link
                    href="/home"
                    className="flex-1 py-2 rounded-xl bg-surface-container-low text-on-surface-variant text-xs font-bold text-center hover:bg-surface-container-high transition-colors"
                  >
                    Ver detalles
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
