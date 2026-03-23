"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";


import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useAppointments";
import { Appointment } from "@/types";
import { formatDateES, formatTimeES, formatCurrency, statusLabel } from "@/lib/utils";
import NewAppointmentModal from "@/components/appointments/NewAppointmentModal";
import PaymentModal from "@/components/appointments/PaymentModal";

// Color map para el estado de la cita
const statusConfig: Record<
  string,
  { dot: string; border: string; badge: string; badgeText: string }
> = {
  pending: {
    dot: "bg-outline-variant",
    border: "border-outline-variant",
    badge: "bg-surface-container text-on-surface-variant",
    badgeText: "Pendiente",
  },
  confirmed: {
    dot: "bg-outline-variant",
    border: "border-outline-variant",
    badge: "bg-surface-container text-on-surface-variant",
    badgeText: "Confirmado",
  },
  completed: {
    dot: "bg-tertiary",
    border: "border-tertiary",
    badge: "bg-tertiary/10 text-tertiary",
    badgeText: "Completado",
  },
  no_show: {
    dot: "bg-error",
    border: "border-error",
    badge: "bg-error-container text-on-error-container",
    badgeText: "No-show",
  },
  cancelled: {
    dot: "bg-error",
    border: "border-error",
    badge: "bg-error-container text-on-error-container",
    badgeText: "Cancelado",
  },
};

export default function Home() {
  const { user, loadUser } = useAuth();
  const { selectedDate } = useAppStore();
  const { appointments, loading, fetchByDate, updateStatus, registerPayment } =
    useAppointments();

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<Appointment | null>(null);


  // Cargar usuario si no está en store
  useEffect(() => {
    if (!user) loadUser();
  }, [user, loadUser]);

  // Cargar citas del día
  useEffect(() => {
    const date = selectedDate || new Date().toISOString().split("T")[0];
    fetchByDate(date);
  }, [selectedDate, fetchByDate]);

  const today = new Date();
  const todayRevenue = appointments
    .filter((a) => a.status === "completed" && a.payment?.isPaid)
    .reduce((sum, a) => sum + (a.payment?.amount ?? 0), 0);

  const displayName = user?.name?.split(" ")[0] ?? "Profesional";
  const dateLabel = formatDateES(today);

  return (
    <main className="pt-20 px-6 max-w-2xl mx-auto pb-32">
      {/* Hero Section */}
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          Hola, {displayName}
        </h1>
        <p className="text-on-surface-variant font-medium mt-1 capitalize">
          {dateLabel}
        </p>
      </section>

      {/* Marketing / Promotions Access */}
      <section className="mb-10">
        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-3xl p-6 shadow-lg shadow-purple-500/20 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-110 transition-transform"></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-white font-bold text-lg">Impulsa tu negocio</h3>
              <p className="text-purple-100 text-xs">Crea promociones y atrae más clientas</p>
            </div>
            <Link 
              href="/promotions"
              className="bg-white text-purple-700 px-5 py-2.5 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-all"
            >
              Ver Promos
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10 shadow-sm">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider block mb-2 opacity-70">
            Ingresos Hoy
          </span>
          <span className="text-2xl font-extrabold text-primary">
            {formatCurrency(todayRevenue)}
          </span>
        </div>
        <div className="bg-surface-container-low p-5 rounded-3xl border border-outline-variant/10 shadow-sm">
          <span className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider block mb-2 opacity-70">
            Citas
          </span>
          <span className="text-2xl font-extrabold text-primary">
            {appointments.filter((a) => a.status === "completed").length}/
            {appointments.filter((a) => a.status !== "cancelled").length}
          </span>
        </div>
      </div>


      {/* Próximas Citas */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-on-surface">Próximas Citas</h2>
        <Link href="/appointments" className="text-primary font-bold text-sm hover:underline">
          Ver todas
        </Link>
      </div>


      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-10">
          <span className="material-symbols-outlined text-primary animate-spin text-3xl">
            progress_activity
          </span>
        </div>
      )}

      {/* Empty state */}
      {!loading && appointments.length === 0 && (
        <div className="text-center py-16 text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-3 block">
            event_available
          </span>
          <p className="font-semibold">No hay citas para hoy</p>
          <p className="text-sm mt-1">Toca + para agregar una</p>
        </div>
      )}

      {/* Timeline de citas: Pendientes/Confirmadas */}
      {!loading && appointments.filter(a => a.status === "confirmed" || a.status === "pending").length > 0 && (
        <div className="space-y-6 relative mb-12">
          <div className="absolute left-4 top-0 bottom-0 w-px border-l-2 border-dotted border-outline-variant opacity-30 pointer-events-none"></div>

          {appointments.filter(a => a.status === "confirmed" || a.status === "pending").map((apt) => {

            const cfg =
              statusConfig[apt.status] ?? statusConfig["confirmed"];
            const isActive = apt.status === "confirmed" || apt.status === "pending";

            return (
              <div key={apt.id} className="relative flex gap-6">
                <div className="flex-none w-8 flex flex-col items-center">
                  <div
                    className={`w-4 h-4 rounded-full ${cfg.dot} ring-4 ring-white z-10`}
                  />
                </div>
                <div
                  className={`flex-1 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border-l-4 ${cfg.border} ${apt.status === "no_show" ? "opacity-75" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                        {formatTimeES(apt.startTime)}
                      </span>
                      <h3
                        className={`text-lg font-bold text-on-surface ${apt.status === "no_show" ? "line-through decoration-error/40" : ""}`}
                      >
                        {apt.client?.name}
                      </h3>
                      <p className="text-on-surface-variant text-sm">
                        {apt.service?.name}
                      </p>
                    </div>
                    <span
                      className={`${cfg.badge} text-[10px] font-bold px-2 py-1 rounded-full uppercase`}
                    >
                      {statusLabel(apt.status)}
                    </span>
                  </div>

                  {/* Acciones según estado */}
                  {isActive && (
                    <div className="grid grid-cols-3 gap-2 mt-4">
                      <button
                        onClick={() => updateStatus(apt.id, "completed")}
                        className="py-2 rounded-lg bg-surface-container-low text-[11px] font-bold text-on-surface-variant flex flex-col items-center gap-1 hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">
                          check_circle
                        </span>
                        Listo
                      </button>
                      <button
                        onClick={() => updateStatus(apt.id, "no_show")}
                        className="py-2 rounded-lg bg-surface-container-low text-[11px] font-bold text-on-surface-variant flex flex-col items-center gap-1 hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">
                          cancel
                        </span>
                        No-show
                      </button>
                      <button
                        onClick={() => setPaymentTarget(apt)}
                        className="py-2 rounded-lg bg-surface-container-low text-[11px] font-bold text-on-surface-variant flex flex-col items-center gap-1 hover:bg-surface-container-high transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">
                          payments
                        </span>
                        Cobrar
                      </button>
                    </div>
                  )}

                  {apt.status === "completed" && !apt.payment?.isPaid && (
                    <button
                      onClick={() => setPaymentTarget(apt)}
                      className="mt-4 w-full py-2 rounded-full border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface transition-colors"
                    >
                      Registrar pago
                    </button>
                  )}

                  {apt.status === "completed" && apt.payment?.isPaid && (
                    <div className="mt-3 flex items-center gap-2 text-tertiary text-xs font-semibold">
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                        payments
                      </span>
                      {formatCurrency(apt.payment.amount)} · {apt.payment.method.replace(/_/g, " ")}
                    </div>
                  )}

                  {apt.status === "no_show" && (
                    <button className="mt-4 flex-1 w-full py-2 rounded-full border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface transition-colors">
                      Reagendar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Citas Realizadas Hoy */}
      {!loading && appointments.filter(a => a.status === "completed").length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-bold text-on-surface mb-6">Realizadas Hoy</h2>
          <div className="space-y-4">
            {appointments.filter(a => a.status === "completed").map((apt) => {
              const cfg = statusConfig.completed;
              return (
                <div 
                  key={apt.id} 
                  className="bg-surface-container-low/40 p-4 rounded-2xl border border-outline-variant/10 flex items-center justify-between group hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-tertiary/10 flex items-center justify-center text-tertiary">
                      <span className="material-symbols-outlined">check_circle</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-on-surface leading-tight">{apt.client?.name}</h4>
                      <p className="text-xs text-on-surface-variant">{apt.service?.name} · {formatTimeES(apt.startTime)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-tertiary">{formatCurrency(apt.payment?.amount ?? 0)}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-tighter opacity-60">
                      {apt.payment?.method.replace(/_/g, " ")}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}


      {/* FAB */}
      <button
        onClick={() => setNewModalOpen(true)}
        className="fixed bottom-28 right-6 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40"
      >
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>

      {/* Modal: Nueva cita */}
      {newModalOpen && (
        <NewAppointmentModal
          onClose={() => setNewModalOpen(false)}
          onCreated={() => {
            setNewModalOpen(false);
            const date = selectedDate || new Date().toISOString().split("T")[0];
            fetchByDate(date);
          }}
        />
      )}

      {/* Modal: Registrar pago */}
      {paymentTarget && (
        <PaymentModal
          appointment={paymentTarget}
          onClose={() => setPaymentTarget(null)}
          onSaved={async (paymentData) => {
            await registerPayment(paymentTarget.id, paymentData);
            await updateStatus(paymentTarget.id, "completed");
            setPaymentTarget(null);
          }}
        />
      )}
    </main>
  );
}
