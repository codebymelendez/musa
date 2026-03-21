"use client";

import { useEffect } from "react";
import { useStats } from "@/hooks/useStats";
import { formatCurrency } from "@/lib/utils";

export default function Stats() {
  const { stats, loading, fetchStats } = useStats();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const now = new Date();
  const monthLabel = now.toLocaleDateString("es-VE", {
    month: "long",
    year: "numeric",
  });

  const maxCount = stats?.topServices?.[0]?.count ?? 1;

  return (
    <main className="max-w-screen-xl mx-auto px-6 pt-24 pb-32 space-y-8">
      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary animate-spin text-3xl">
            progress_activity
          </span>
        </div>
      )}

      {!loading && (
        <>
          {/* 1. Resumen Mensual */}
          <section className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-on-surface-variant text-sm font-medium tracking-wide mb-1 uppercase capitalize">
                  {monthLabel}
                </p>
                <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight">
                  {formatCurrency(stats?.monthlyRevenue ?? 0)}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">event_available</span>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-sm">Citas realizadas</p>
                    <p className="text-on-surface font-bold text-2xl">
                      {stats?.completedAppointments ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-container-low p-6 rounded-[24px]">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-2xl">group</span>
                  </div>
                  <div>
                    <p className="text-on-surface-variant text-sm">Total clientas</p>
                    <p className="text-on-surface font-bold text-2xl">
                      {stats?.totalClients ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Top Servicios */}
          {stats?.topServices && stats.topServices.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-bold text-xl text-on-surface px-1">Top Servicios</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.topServices.map((svc, idx) => {
                  const colors = ["primary", "secondary", "tertiary"];
                  const color = colors[idx] ?? "primary";
                  const barWidth = Math.round((svc.count / maxCount) * 100);

                  return (
                    <div
                      key={svc.serviceName}
                      className="bg-surface-container-lowest p-5 rounded-[24px] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]"
                    >
                      <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full"></div>
                      <div className="z-10">
                        <span className={`text-${color} font-black text-4xl opacity-20`}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h4 className="font-bold text-lg mt-1">{svc.serviceName}</h4>
                      </div>
                      <div className="z-10 flex items-end justify-between">
                        <p className="text-on-surface-variant text-sm">
                          {svc.count} servicio{svc.count !== 1 ? "s" : ""}
                        </p>
                        <div className="h-1.5 w-24 bg-surface-container rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-${color}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* 3. Métricas detalladas */}
          <section className="space-y-4">
            <h3 className="font-bold text-xl text-on-surface px-1">Métricas Detalladas</h3>
            <div className="space-y-3">
              <div className="bg-surface-container-low p-6 rounded-[24px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      payments
                    </span>
                  </div>
                  <div>
                    <p className="text-on-surface font-semibold">Ingresos Anuales</p>
                    <p className="text-on-surface-variant text-sm">Acumulado del año</p>
                  </div>
                </div>
                <p className="font-bold text-lg">
                  {formatCurrency((stats as (typeof stats & { yearlyRevenue?: number }))?.yearlyRevenue ?? 0)}
                </p>
              </div>

              <div className="bg-surface-container-low p-6 rounded-[24px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
                      analytics
                    </span>
                  </div>
                  <div>
                    <p className="text-on-surface font-semibold">Ticket Promedio</p>
                    <p className="text-on-surface-variant text-sm">Por cita completada</p>
                  </div>
                </div>
                <p className="font-bold text-lg">
                  {formatCurrency(stats?.avgTicket ?? 0)}
                </p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <div className="pt-4 pb-8">
            <button className="w-full h-[56px] bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 active:scale-95 transition-transform duration-200">
              Descargar Reporte PDF
            </button>
          </div>
        </>
      )}
    </main>
  );
}
