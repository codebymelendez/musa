"use client";

import { useEffect, useCallback, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";
import { useAppointments } from "@/hooks/useAppointments";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeES, formatCurrency, toLocalDate } from "@/lib/utils";
import { Appointment } from "@/types";

type FilterPeriod = "today" | "week" | "upcoming" | "all";

const PERIOD_LABELS: Record<FilterPeriod, string> = {
  today:    "Hoy",
  week:     "Esta semana",
  upcoming: "Próximas",
  all:      "Todo",
};

const STATUS_DOT: Record<string, string> = {
  pending:     "bg-border",
  confirmed:   "bg-primary",
  completed:   "bg-success",
  cancelled:   "bg-error",
  no_show:     "bg-error",
  rescheduled: "bg-warning",
};

const STATUS_BORDER: Record<string, string> = {
  pending:     "border-l-border",
  confirmed:   "border-l-primary",
  completed:   "border-l-success",
  cancelled:   "border-l-error",
  no_show:     "border-l-error",
  rescheduled: "border-l-warning",
};

/* Returns entries sorted by date key (YYYY-MM-DD → Appointment[]) */
function groupByDate(appointments: Appointment[], tz: string): [string, Appointment[]][] {
  const map = new Map<string, Appointment[]>();
  for (const apt of appointments) {
    const key = toLocalDate(new Date(apt.startTime), tz); // YYYY-MM-DD in business timezone
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(apt);
  }
  return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
}

function formatGroupDate(dateKey: string, tz: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date     = new Date(Date.UTC(y, m - 1, d));
  const todayStr = toLocalDate(new Date(), tz);
  const tomorrowDate = new Date();
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = toLocalDate(tomorrowDate, tz);

  if (dateKey === todayStr)    return "Hoy";
  if (dateKey === tomorrowStr) return "Mañana";

  return date.toLocaleDateString("es-VE", {
    weekday: "long",
    day:     "numeric",
    month:   "long",
    timeZone: "UTC",
  });
}

function findNextAppointmentId(appointments: Appointment[]): string | null {
  const now = new Date();
  const upcoming = appointments
    .filter(
      (a) =>
        new Date(a.startTime) > now &&
        (a.status === "confirmed" || a.status === "pending")
    )
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  return upcoming[0]?.id ?? null;
}

export default function AppointmentsPage() {
  const { user } = useAuth();
  const tz = user?.business?.timezone || "America/Caracas";
  const { appointments, loading, fetchByRange } = useAppointments();
  const [period, setPeriod] = useState<FilterPeriod>("upcoming");

  const loadAppointments = useCallback(async () => {
    const base = new Date();
    let start: Date, end: Date;

    switch (period) {
      case "today": {
        start = new Date(base);
        start.setHours(0, 0, 0, 0);
        end = new Date(base);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case "week": {
        start = new Date(base);
        end = new Date(base);
        end.setDate(base.getDate() + 7);
        break;
      }
      case "upcoming": {
        start = new Date(base);
        end = new Date(base);
        end.setDate(base.getDate() + 30);
        break;
      }
      default: {
        start = new Date(base);
        start.setMonth(base.getMonth() - 3);
        end = new Date(base);
        end.setMonth(base.getMonth() + 1);
        break;
      }
    }

    await fetchByRange(start.toISOString(), end.toISOString());
  }, [period, fetchByRange]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const grouped    = groupByDate(appointments, tz);
  const nextAptId  = findNextAppointmentId(appointments);

  return (
    <div className="min-h-screen bg-background pb-32 animate-page">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <Link
            href="/home"
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-[18px] font-light italic text-on-surface leading-none">
              Citas
            </h1>
            <p className="text-[11px] text-on-surface-subtle mt-1">
              Zona horaria: {tz}
            </p>
          </div>
          <Link
            href="/calendar"
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
            aria-label="Ver agenda"
          >
            <CalendarDaysIcon className="w-5 h-5" />
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-5">

        {/* ── Period filter ──────────────────────────────────────── */}
        <div className="flex gap-1 overflow-x-auto pb-5 hide-scrollbar">
          {(Object.entries(PERIOD_LABELS) as [FilterPeriod, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={`flex-shrink-0 font-ui text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-150 ${
                  period === key
                    ? "bg-primary text-on-primary"
                    : "text-on-surface-muted hover:text-on-surface"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>

        {/* ── Loading skeletons ─────────────────────────────────── */}
        {loading && (
          <div>
            {[1, 2, 3, 4, 5].map((i) => (
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

        {/* ── Empty state ───────────────────────────────────────── */}
        {!loading && appointments.length === 0 && (
          <div className="py-20 text-center">
            <p
              className="font-display italic font-light text-on-surface mb-2"
              style={{ fontSize: "26px" }}
            >
              {period === "today"
                ? "La agenda está libre hoy."
                : "Sin citas en este período."}
            </p>
            <p className="font-ui text-[13px] text-on-surface-muted">
              {period === "today"
                ? "Un buen momento para planificar la semana."
                : "Aquí aparecerán las citas cuando las haya."}
            </p>
          </div>
        )}

        {/* ── Grouped list ──────────────────────────────────────── */}
        {!loading && appointments.length > 0 && (
          <div>
            {grouped.map(([dateKey, dayApts]) => (
              <div key={dateKey}>

                {/* Date group header */}
                <div className="flex items-baseline gap-3 py-4 border-t border-border-subtle">
                  <span className="musa-sublabel capitalize">
                    {formatGroupDate(dateKey, tz)}
                  </span>
                  <span className="font-ui text-[11px] text-on-surface-subtle">
                    {dayApts.length}{" "}
                    {dayApts.length === 1 ? "cita" : "citas"}
                  </span>
                </div>

                {/* Appointments for this day */}
                <div className="mb-1 space-y-1">
                  {dayApts.map((apt) => {
                    const isNext   = apt.id === nextAptId;
                    const border   = STATUS_BORDER[apt.status] ?? "border-l-border";
                    const dot      = STATUS_DOT[apt.status]    ?? "bg-border";
                    const isCancelled =
                      apt.status === "cancelled" || apt.status === "no_show";

                    return (
                      <Link
                        key={apt.id}
                        href={`/appointments/${apt.id}`}
                        className="group block"
                      >
                        <div
                          className={`relative border-l-2 ${border} rounded-r-lg pl-4 pr-3 py-3.5
                                      hover:bg-surface-raised/80 transition-colors duration-200
                                      ${isCancelled ? "opacity-55" : ""}`}
                        >
                          {/* "Próxima" label */}
                          {isNext && (
                            <span
                              className="absolute -top-[9px] left-3 font-ui font-medium uppercase text-primary bg-background px-1"
                              style={{ fontSize: "9px", letterSpacing: "0.10em" }}
                            >
                              Próxima
                            </span>
                          )}

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
                                <div
                                  className={`w-[7px] h-[7px] rounded-full mt-1.5 flex-shrink-0 ${dot}`}
                                />
                              </div>

                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="font-ui text-[12px] text-on-surface-muted truncate">
                                  {apt.service?.name}
                                </span>
                                {apt.service?.durationMin && (
                                  <>
                                    <span className="text-on-surface-subtle text-[10px]">
                                      ·
                                    </span>
                                    <span className="font-mono-num text-[11px] text-on-surface-subtle flex-shrink-0">
                                      {apt.service.durationMin}min
                                    </span>
                                  </>
                                )}
                                {apt.service?.price != null && (
                                  <>
                                    <span className="text-on-surface-subtle text-[10px]">
                                      ·
                                    </span>
                                    <span className="font-mono-num text-[12px] text-on-surface flex-shrink-0 font-medium">
                                      {formatCurrency(apt.service.price)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
