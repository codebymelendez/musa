"use client";

import { useEffect } from "react";
import {
  CheckCircleIcon,
  UsersIcon,
  BanknotesIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { useStats } from "@/hooks/useStats";
import { formatCurrency } from "@/lib/utils";

export default function Stats() {
  const { stats, loading, fetchStats } = useStats();

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const now        = new Date();
  const monthLabel = now.toLocaleDateString("es-VE", { month: "long", year: "numeric" });
  const maxCount   = stats?.topServices?.[0]?.count ?? 1;

  const RANK_COLORS = ["text-primary", "text-on-surface-muted", "text-on-surface-subtle"];
  const RANK_BARS   = ["bg-primary",   "bg-border",             "bg-surface-sunken"];

  return (
    <main className="max-w-screen-xl mx-auto px-5 pt-24 pb-32 space-y-8 animate-page">
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && (
        <>
          {/* ── Monthly summary ───────────────────────────────────── */}
          <section className="space-y-4">
            <div>
              <p className="font-ui text-[11px] font-semibold tracking-widest text-on-surface-muted uppercase capitalize mb-1">
                {monthLabel}
              </p>
              <h2 className="font-display text-[48px] font-semibold text-on-surface tracking-[-0.02em] leading-none">
                {formatCurrency(stats?.monthlyRevenue ?? 0, stats?.currency)}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-surface-raised border border-border-subtle rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-ui text-[13px] text-on-surface-muted">Citas realizadas</p>
                    <p className="font-display text-[28px] font-semibold text-on-surface leading-none">
                      {stats?.completedAppointments ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-surface-raised border border-border-subtle rounded-xl p-6 shadow-xs">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
                    <UsersIcon className="w-5 h-5 text-sienna-500" />
                  </div>
                  <div>
                    <p className="font-ui text-[13px] text-on-surface-muted">Total clientas</p>
                    <p className="font-display text-[28px] font-semibold text-on-surface leading-none">
                      {stats?.totalClients ?? 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Top services ──────────────────────────────────────── */}
          {stats?.topServices && stats.topServices.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-ui font-semibold text-[18px] text-on-surface">Top Servicios</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.topServices.map((svc, idx) => {
                  const barWidth = Math.round((svc.count / maxCount) * 100);
                  return (
                    <div
                      key={svc.serviceName}
                      className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                    >
                      <div className="absolute -right-3 -top-3 w-20 h-20 bg-primary/[0.04] rounded-full" />
                      <div className="relative">
                        <span className={`font-display text-[36px] font-semibold opacity-15 leading-none ${RANK_COLORS[idx] ?? "text-on-surface-subtle"}`}>
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <h4 className="font-ui font-semibold text-[15px] text-on-surface mt-1 leading-tight">
                          {svc.serviceName}
                        </h4>
                      </div>
                      <div className="flex items-end justify-between mt-3">
                        <p className="font-ui text-[12px] text-on-surface-muted">
                          {svc.count} servicio{svc.count !== 1 ? "s" : ""}
                        </p>
                        <div className="h-1 w-20 bg-surface-sunken rounded-full overflow-hidden">
                          <div
                            className={`h-full ${RANK_BARS[idx] ?? "bg-border"} rounded-full`}
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

          {/* ── Detailed metrics ──────────────────────────────────── */}
          <section className="space-y-4">
            <h3 className="font-ui font-semibold text-[18px] text-on-surface">Métricas Detalladas</h3>
            <div className="space-y-3">
              <div className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-success-surface flex items-center justify-center">
                    <BanknotesIcon className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-ui font-semibold text-[14px] text-on-surface">Ingresos Anuales</p>
                    <p className="font-ui text-[12px] text-on-surface-muted">Acumulado del año</p>
                  </div>
                </div>
                <p className="font-ui font-semibold text-[16px] text-on-surface">
                  {formatCurrency((stats as (typeof stats & { yearlyRevenue?: number }))?.yearlyRevenue ?? 0, stats?.currency)}
                </p>
              </div>

              <div className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-ui font-semibold text-[14px] text-on-surface">Ticket Promedio</p>
                    <p className="font-ui text-[12px] text-on-surface-muted">Por cita completada</p>
                  </div>
                </div>
                <p className="font-ui font-semibold text-[16px] text-on-surface">
                  {formatCurrency(stats?.avgTicket ?? 0, stats?.currency)}
                </p>
              </div>
            </div>
          </section>

          {/* ── CTA ───────────────────────────────────────────────── */}
          <div className="pt-2 pb-4">
            <button className="w-full h-12 bg-primary text-on-primary rounded-full font-ui font-semibold text-[14px] shadow-primary-sm hover:bg-primary-hover active:scale-[0.98] transition-all">
              Descargar Reporte PDF
            </button>
          </div>
        </>
      )}
    </main>
  );
}
