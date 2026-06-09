"use client";

import { useEffect, useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useAppStore } from "@/store/useAppStore";
import { useAuth } from "@/hooks/useAuth";
import { useAppointments } from "@/hooks/useAppointments";
import { useStats } from "@/hooks/useStats";
import { Appointment, AppointmentStatus } from "@/types";
import { formatTimeES, formatCurrency } from "@/lib/utils";
import PlanUsageWidget from "@/components/PlanUsageWidget";
import {
  PlusIcon,
  CheckCircleIcon,
  BanknotesIcon,
  XCircleIcon,
  UserPlusIcon,
  CalendarDaysIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

const NewAppointmentModal = dynamic(
  () => import("@/components/appointments/NewAppointmentModal"),
  { ssr: false }
);
const PaymentModal = dynamic(
  () => import("@/components/appointments/PaymentModal"),
  { ssr: false }
);

const STATUS_BORDER: Record<string, string> = {
  pending:     "border-l-border",
  confirmed:   "border-l-primary",
  completed:   "border-l-success",
  cancelled:   "border-l-error",
  no_show:     "border-l-error",
  rescheduled: "border-l-warning",
};

const STATUS_DOT: Record<string, string> = {
  pending:     "bg-border",
  confirmed:   "bg-primary",
  completed:   "bg-success",
  cancelled:   "bg-error",
  no_show:     "bg-error",
  rescheduled: "bg-warning",
};

function getWeekBounds(): { start: string; end: string } {
  const now = new Date();
  const day = now.getDay(); // 0 = Sun
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon);
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  sun.setHours(23, 59, 59, 999);
  return { start: mon.toISOString(), end: sun.toISOString() };
}

export default function Home() {
  const { user, isHydrated, loadUser } = useAuth();
  const { selectedDate } = useAppStore();

  /* two independent instances — today vs. this week */
  const {
    appointments: todayApts,
    loading:       loadingToday,
    fetchByDate,
    updateStatus,
    registerPayment,
  } = useAppointments();

  const {
    appointments: weekApts,
    loading:       loadingWeek,
    fetchByRange:  fetchWeekRange,
  } = useAppointments();

  const { stats, loading: loadingStats, fetchStats } = useStats();

  const [newModalOpen,   setNewModalOpen]   = useState(false);
  const [paymentTarget,  setPaymentTarget]  = useState<Appointment | null>(null);

  /* ── Initial data load ───────────────────────────────────────────── */
  useEffect(() => {
    if (!user) loadUser();
  }, [user, loadUser]);

  useEffect(() => {
    if (!isHydrated || !user) return;
    const todayStr = new Date().toISOString().split("T")[0];
    fetchByDate(todayStr);
    const { start, end } = getWeekBounds();
    fetchWeekRange(start, end);
    fetchStats();
  }, [isHydrated, user, fetchByDate, fetchWeekRange, fetchStats]);

  /* ── Computed values ─────────────────────────────────────────────── */
  const today = useMemo(() => new Date(), []);

  const greeting = useMemo(() => {
    const h = today.getHours();
    return h < 12 ? "Buenos días" : h < 19 ? "Buenas tardes" : "Buenas noches";
  }, [today]);

  const displayName = user?.name?.split(" ")[0] ?? "";

  const tz = user?.business?.timezone || "America/Caracas";
  const dateLabel = today.toLocaleDateString("es-VE", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    timeZone: tz,
  });

  /* Today's appointments (excluding cancelled/no_show from the count) */
  const todaySorted = useMemo(
    () =>
      [...todayApts].sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      ),
    [todayApts]
  );

  const todayActive = useMemo(
    () => todaySorted.filter((a) => !["cancelled", "no_show"].includes(a.status)),
    [todaySorted]
  );

  const expectedRevenue = useMemo(
    () => todayActive.reduce((sum, a) => sum + (a.service?.price ?? 0), 0),
    [todayActive]
  );

  /* ID of the next upcoming appointment */
  const nextAptId = useMemo(() => {
    const now = new Date();
    return (
      todayApts
        .filter(
          (a) =>
            new Date(a.startTime) > now &&
            ["confirmed", "pending"].includes(a.status)
        )
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )[0]?.id ?? null
    );
  }, [todayApts]);

  /* Week count (non-cancelled, non-no_show) */
  const weekCount = useMemo(
    () =>
      weekApts.filter((a) => !["cancelled", "no_show"].includes(a.status))
        .length,
    [weekApts]
  );

  /* Recent activity: completed/no_show earlier than today (from the week fetch) */
  const recentActivity = useMemo(() => {
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    return [...weekApts]
      .filter(
        (a) =>
          ["completed", "no_show"].includes(a.status) &&
          new Date(a.startTime) < todayStart
      )
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )
      .slice(0, 3);
  }, [weekApts, today]);

  /* ── Handlers ────────────────────────────────────────────────────── */
  const handleStatusUpdate = useCallback(
    async (id: string, status: AppointmentStatus) => {
      await updateStatus(id, status);
    },
    [updateStatus]
  );

  const refreshToday = useCallback(() => {
    const todayStr = new Date().toISOString().split("T")[0];
    fetchByDate(todayStr);
  }, [fetchByDate]);

  /* ─────────────────────────────────────────────────────────────────── */
  return (
    <main className="pt-[88px] px-5 max-w-3xl mx-auto pb-36 animate-page">

      {/* ── Greeting ──────────────────────────────────────────────────── */}
      <section className="pt-8 mb-6">
        {!isHydrated ? (
          <div className="space-y-2">
            <div className="w-56 h-9 rounded bg-surface-sunken animate-pulse" />
            <div className="w-32 h-3 rounded bg-surface-sunken animate-pulse" />
          </div>
        ) : (
          <>
            <h1
              className="font-display font-normal italic text-on-surface leading-none"
              style={{ fontSize: "clamp(30px, 7vw, 40px)" }}
            >
              {greeting}{displayName ? `, ${displayName}` : ""}.
            </h1>
            <p className="font-ui text-[12px] text-on-surface-subtle mt-2 capitalize tracking-[0.01em]">
              {dateLabel} · Horarios en zona horaria: <strong>{tz}</strong>
            </p>
          </>
        )}
      </section>

      {/* MUSA signature rule */}
      <div className="mb-8 space-y-[3px]">
        <div className="h-px bg-primary opacity-35 w-full" />
        <div className="h-[0.5px] bg-[#C4996A] opacity-40" style={{ width: "55%" }} />
      </div>

      {/* ── HOY: hero stat + agenda ────────────────────────────────────── */}
      <section className="mb-10">
        <p className="musa-sublabel text-on-surface-subtle mb-5">
          Hoy
        </p>

        {/* Hero metric — appointments + revenue as two-metric display */}
        {loadingToday ? (
          <div className="flex items-end gap-8 mb-7">
            <div className="space-y-2">
              <div className="w-20 h-16 rounded bg-surface-sunken animate-pulse" />
              <div className="w-16 h-3 rounded bg-surface-sunken animate-pulse" />
            </div>
          </div>
        ) : todayActive.length === 0 ? (
          <div className="py-6 mb-4">
            <div className="musa-rule w-[60px] mb-5" />
            <p
              className="font-display font-light italic text-on-surface mb-1"
              style={{ fontSize: "26px" }}
            >
              La agenda está libre hoy.
            </p>
            <p className="font-ui text-[13px] text-on-surface-muted">
              Un buen momento para planificar la semana.
            </p>
          </div>
        ) : (
          <div className="flex items-end gap-7 mb-7">
            {/* Primary: appointment count */}
            <div>
              <span
                className="font-display font-normal text-on-surface leading-none"
                style={{ fontSize: "80px", letterSpacing: "-0.04em" }}
              >
                {todayActive.length}
              </span>
              <p className="font-ui text-[12px] text-on-surface-muted mt-1">
                {todayActive.length === 1 ? "cita hoy" : "citas hoy"}
              </p>
            </div>

            {/* Divider + secondary metric: expected revenue */}
            {expectedRevenue > 0 && (
              <>
                <div className="w-px h-12 bg-border-subtle self-center flex-shrink-0" />
                <div>
                  <p
                    className="font-mono-num text-[22px] text-on-surface leading-none"
                    style={{ letterSpacing: "-0.02em" }}
                  >
                    {formatCurrency(expectedRevenue)}
                  </p>
                  <p className="font-ui text-[12px] text-on-surface-muted mt-1">
                    ingreso esperado
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Agenda list */}
        {!loadingToday && (
          <>
            {todaySorted.filter((a) => a.status !== "cancelled").length > 0 && (
              <div className="flex items-center justify-between mb-3">
                <p className="musa-sublabel text-on-surface-subtle">
                  Agenda
                </p>
                <Link
                  href="/appointments"
                  className="font-ui text-[12px] text-on-surface-muted hover:text-primary transition-colors flex items-center gap-0.5"
                >
                  Ver todo
                  <ArrowRightIcon className="w-3 h-3" />
                </Link>
              </div>
            )}

            <div className="space-y-1">
              {todaySorted
                .filter((a) => a.status !== "cancelled")
                .map((apt) => {
                  const isNext     = apt.id === nextAptId;
                  const border     = STATUS_BORDER[apt.status] ?? "border-l-border";
                  const dot        = STATUS_DOT[apt.status]    ?? "bg-border";
                  const isActive   = ["pending", "confirmed", "rescheduled"].includes(apt.status);
                  const isFaded    = apt.status === "no_show";

                  return (
                    <div key={apt.id} className="relative">
                      {isNext && (
                        <span
                          className="absolute -top-[9px] left-3 font-ui font-medium uppercase text-primary bg-background px-1 z-10"
                          style={{ fontSize: "9px", letterSpacing: "0.10em" }}
                        >
                          Próxima
                        </span>
                      )}

                      <div
                        className={`border-l-2 ${border} rounded-r-lg pl-4 pr-3 py-3.5
                                    hover:bg-surface-raised/80 transition-colors duration-200
                                    ${isFaded ? "opacity-55" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Time */}
                          <div className="flex-shrink-0 w-[50px] pt-px text-right">
                            <span className="font-mono-num text-[13px] text-on-surface-muted">
                              {formatTimeES(apt.startTime, tz)}
                            </span>
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-ui font-medium text-[15px] text-on-surface leading-tight truncate">
                                {apt.client?.name}
                              </p>
                              <div className={`w-[7px] h-[7px] rounded-full mt-1.5 flex-shrink-0 ${dot}`} />
                            </div>

                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              <span className="font-ui text-[12px] text-on-surface-muted truncate">
                                {apt.service?.name}
                              </span>
                              {apt.service?.durationMin && (
                                <>
                                  <span className="text-on-surface-subtle text-[10px]">·</span>
                                  <span className="font-mono-num text-[11px] text-on-surface-subtle flex-shrink-0">
                                    {apt.service.durationMin}min
                                  </span>
                                </>
                              )}
                              {apt.service?.price != null && (
                                <>
                                  <span className="text-on-surface-subtle text-[10px]">·</span>
                                  <span className="font-mono-num text-[12px] text-on-surface flex-shrink-0 font-medium">
                                    {formatCurrency(apt.service.price)}
                                  </span>
                                </>
                              )}
                            </div>

                            {/* Quick actions — active appointments */}
                            {isActive && (
                              <div className="flex items-center gap-3 mt-2.5 pt-2.5 border-t border-border-subtle">
                                <button
                                  onClick={() => handleStatusUpdate(apt.id, "completed")}
                                  className="flex items-center gap-1 font-ui text-[11px] font-medium text-on-surface-muted hover:text-success transition-colors"
                                >
                                  <CheckCircleIcon className="w-3.5 h-3.5" />
                                  Completar
                                </button>
                                <button
                                  onClick={() => handleStatusUpdate(apt.id, "no_show")}
                                  className="flex items-center gap-1 font-ui text-[11px] font-medium text-on-surface-muted hover:text-error transition-colors"
                                >
                                  <XCircleIcon className="w-3.5 h-3.5" />
                                  No asistió
                                </button>
                                <button
                                  onClick={() => setPaymentTarget(apt)}
                                  className="flex items-center gap-1 font-ui text-[11px] font-medium text-on-surface-muted hover:text-primary transition-colors ml-auto"
                                >
                                  <BanknotesIcon className="w-3.5 h-3.5" />
                                  Cobrar
                                </button>
                              </div>
                            )}

                            {/* Completed: payment status */}
                            {apt.status === "completed" && (
                              <div className="mt-2.5 pt-2.5 border-t border-border-subtle">
                                {apt.payment?.isPaid ? (
                                  <p className="font-ui text-[11px] text-success flex items-center gap-1">
                                    <BanknotesIcon className="w-3.5 h-3.5" />
                                    {formatCurrency(apt.payment.amount)} cobrado
                                  </p>
                                ) : (
                                  <button
                                    onClick={() => setPaymentTarget(apt)}
                                    className="flex items-center gap-1 font-ui text-[11px] font-medium text-on-surface-muted hover:text-primary transition-colors"
                                  >
                                    <BanknotesIcon className="w-3.5 h-3.5" />
                                    Registrar pago
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </>
        )}

        {/* Agenda skeleton */}
        {loadingToday && (
          <div className="mt-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="py-4 border-t border-border-subtle flex items-start gap-4"
              >
                <div className="w-12 h-4 rounded bg-surface-sunken animate-pulse flex-shrink-0 mt-1" />
                <div className="flex-1 space-y-2.5">
                  <div
                    className="h-[15px] rounded bg-surface-sunken animate-pulse"
                    style={{ width: `${40 + (i * 17) % 40}%` }}
                  />
                  <div
                    className="h-[11px] rounded bg-surface-sunken animate-pulse"
                    style={{ width: `${25 + (i * 13) % 30}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Stats: Esta semana + Este mes ─────────────────────────────── */}
      <section className="grid grid-cols-2 gap-4 mb-8">

        {/* Esta semana — slightly elevated card */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          {loadingWeek ? (
            <div className="space-y-2">
              <div className="w-20 h-3 rounded bg-surface-sunken animate-pulse" />
              <div className="w-10 h-10 rounded bg-surface-sunken animate-pulse" />
              <div className="w-16 h-3 rounded bg-surface-sunken animate-pulse" />
            </div>
          ) : (
            <>
              <p className="musa-sublabel text-on-surface-subtle mb-3">
                Esta semana
              </p>
              <p
                className="font-display font-normal text-on-surface leading-none"
                style={{ fontSize: "42px", letterSpacing: "-0.03em" }}
              >
                {weekCount}
              </p>
              <p className="font-ui text-[12px] text-on-surface-muted mt-2">
                {weekCount === 1 ? "cita" : "citas"}
              </p>
            </>
          )}
        </div>

        {/* Este mes */}
        <div className="bg-surface-raised border border-border-subtle rounded-xl p-6">
          {loadingStats ? (
            <div className="space-y-2">
              <div className="w-16 h-3 rounded bg-surface-sunken animate-pulse" />
              <div className="w-14 h-10 rounded bg-surface-sunken animate-pulse" />
              <div className="w-24 h-3 rounded bg-surface-sunken animate-pulse" />
            </div>
          ) : (
            <>
              <p className="musa-sublabel text-on-surface-subtle mb-3">
                Este mes
              </p>
              <p
                className="font-display font-normal text-on-surface leading-none"
                style={{ fontSize: "42px", letterSpacing: "-0.03em" }}
              >
                {stats?.completedAppointments ?? 0}
              </p>
              <p className="font-ui text-[12px] text-on-surface-muted mt-2">
                {stats?.monthlyRevenue
                  ? `citas · ${formatCurrency(stats.monthlyRevenue)}`
                  : "citas completadas"}
              </p>
            </>
          )}
        </div>
      </section>

      {/* ── Plan usage ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <PlanUsageWidget />
      </div>

      {/* ── Accesos rápidos ───────────────────────────────────────────── */}
      <section className="mb-8">
        <p className="musa-sublabel text-on-surface-subtle mb-4">
          Accesos rápidos
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Primary action — filled terracotta */}
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-full bg-primary text-on-primary font-ui text-[13px] font-medium shadow-primary-sm hover:bg-primary-hover transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Nueva cita
          </button>
          {/* Secondary actions — refined outline */}
          <Link
            href="/clients"
            className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-border font-ui text-[13px] font-medium text-on-surface-muted hover:border-primary-border hover:text-primary hover:bg-primary-surface transition-colors"
          >
            <UserPlusIcon className="w-3.5 h-3.5" />
            Añadir clienta
          </Link>
          <Link
            href="/calendar"
            className="flex items-center gap-1.5 h-9 px-4 rounded-full border border-border font-ui text-[13px] font-medium text-on-surface-muted hover:border-primary-border hover:text-primary hover:bg-primary-surface transition-colors"
          >
            <CalendarDaysIcon className="w-3.5 h-3.5" />
            Ver agenda
          </Link>
        </div>
      </section>

      {/* ── Actividad reciente ────────────────────────────────────────── */}
      {!loadingWeek && recentActivity.length > 0 && (
        <section className="mb-8">
          <p className="musa-sublabel text-on-surface-subtle mb-4">
            Actividad reciente
          </p>
          <div>
            {recentActivity.map((apt, i) => {
              const dot = STATUS_DOT[apt.status] ?? "bg-border";
              return (
                <Link
                  key={apt.id}
                  href={`/appointments/${apt.id}`}
                  className={`flex items-center gap-3 py-3 ${
                    i > 0 ? "border-t border-border-subtle" : ""
                  } hover:opacity-70 transition-opacity`}
                >
                  <div className={`w-[6px] h-[6px] rounded-full flex-shrink-0 ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-ui font-medium text-[14px] text-on-surface truncate">
                      {apt.client?.name}
                    </p>
                    <p className="font-ui text-[12px] text-on-surface-muted truncate">
                      {apt.service?.name}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-mono-num text-[11px] text-on-surface-subtle">
                      {new Date(apt.startTime).toLocaleDateString("es-VE", {
                        day:   "numeric",
                        month: "short",
                        timeZone: tz,
                      })}
                    </p>
                    <p className="font-mono-num text-[11px] text-on-surface-subtle">
                      {formatTimeES(apt.startTime, tz)}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ── FAB ───────────────────────────────────────────────────────── */}
      <button
        onClick={() => setNewModalOpen(true)}
        className="fixed bottom-28 right-5 w-14 h-14 bg-primary text-on-primary rounded-full shadow-primary-md flex items-center justify-center active:scale-90 transition-transform z-40 hover:bg-primary-hover musa-fab"
        aria-label="Nueva cita"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* ── Modals ────────────────────────────────────────────────────── */}
      {newModalOpen && (
        <NewAppointmentModal
          onClose={() => setNewModalOpen(false)}
          onCreated={() => {
            setNewModalOpen(false);
            refreshToday();
          }}
        />
      )}

      {paymentTarget && (
        <PaymentModal
          appointment={paymentTarget}
          paymentMethods={user?.settings?.paymentMethods}
          onClose={() => setPaymentTarget(null)}
          onSaved={async (paymentData) => {
            await registerPayment(paymentTarget.id, paymentData);
            await updateStatus(paymentTarget.id, "completed");
            setPaymentTarget(null);
            refreshToday();
          }}
        />
      )}
    </main>
  );
}
