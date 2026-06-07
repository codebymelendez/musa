"use client";

import { useEffect, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  NoSymbolIcon,
} from "@heroicons/react/24/outline";
import { useAppointments } from "@/hooks/useAppointments";
import { useAvailabilityBlocks } from "@/hooks/useAvailabilityBlocks";
import { Appointment, AvailabilityBlock } from "@/types";
import { weekRangeUTC, parseSupa, formatTimeES, DEFAULT_TZ } from "@/lib/utils";
import BlockTimeModal from "@/components/calendar/BlockTimeModal";
import NewAppointmentModal from "@/components/appointments/NewAppointmentModal";

const DAY_ABBR = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const HOUR_HEIGHT = 80;

function getWeekDays(weekStart: string): Date[] {
  const base = new Date(weekStart);
  return Array.from({ length: 7 }, (_, i) =>
    new Date(base.getTime() + i * 86_400_000)
  );
}

function positionStyle(apt: Appointment): React.CSSProperties {
  const start = parseSupa(apt.startTime);
  const end   = parseSupa(apt.endTime);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour   = end.getHours()   + end.getMinutes()   / 60;
  return {
    top:      `${Math.max(0, (startHour - HOURS[0]) * HOUR_HEIGHT)}px`,
    height:   `${Math.max(20, (endHour - startHour) * HOUR_HEIGHT)}px`,
    position: "absolute",
    left:     "2px",
    right:    "2px",
  };
}

function blockPositionStyle(block: AvailabilityBlock): React.CSSProperties {
  const start     = parseSupa(block.startTime);
  const end       = parseSupa(block.endTime);
  const startHour = Math.max(start.getHours() + start.getMinutes() / 60, HOURS[0]);
  const endHour   = Math.min(end.getHours()   + end.getMinutes()   / 60, HOURS[HOURS.length - 1] + 1);
  return {
    top:      `${(startHour - HOURS[0]) * HOUR_HEIGHT}px`,
    height:   `${Math.max((endHour - startHour) * HOUR_HEIGHT, 16)}px`,
    position: "absolute",
    left:     "0px",
    right:    "0px",
  };
}

export default function Calendar() {
  const [viewMode, setViewMode]     = useState<"weekly" | "monthly">("weekly");
  const [baseDate, setBaseDate]     = useState(new Date());
  const [showBlockModal, setShowBlockModal]               = useState(false);
  const [showNewAppointmentModal, setShowNewAppointmentModal] = useState(false);
  const [businessTz, setBusinessTz] = useState(DEFAULT_TZ);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const tz = data?.settings?.timezone ?? DEFAULT_TZ;
        setBusinessTz(tz);
      })
      .catch(() => {});
  }, []);

  const { start, end } = weekRangeUTC(baseDate, businessTz);
  const weekDays = getWeekDays(start);
  const { appointments, loading, fetchByRange } = useAppointments();
  const { blocks, fetchBlocks } = useAvailabilityBlocks();

  useEffect(() => {
    fetchByRange(start, end);
    fetchBlocks(start, end);
  }, [baseDate, businessTz, fetchByRange, fetchBlocks]);

  const todayStr = new Date().toDateString();
  const weekNum  = Math.ceil(
    (baseDate.getDate() + new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).getDay()) / 7
  );

  const prevWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate() - 7); setBaseDate(d); };
  const nextWeek = () => { const d = new Date(baseDate); d.setDate(d.getDate() + 7); setBaseDate(d); };

  const aptsByDay: Record<number, Appointment[]> = {};
  for (const apt of appointments) {
    const d      = parseSupa(apt.startTime);
    const colIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
    if (!aptsByDay[colIdx]) aptsByDay[colIdx] = [];
    aptsByDay[colIdx].push(apt);
  }

  const blocksByDay: Record<number, AvailabilityBlock[]> = {};
  for (const block of blocks) {
    const bStart = parseSupa(block.startTime);
    const bEnd   = parseSupa(block.endTime);
    weekDays.forEach((day, colIdx) => {
      const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
      const dayEnd   = new Date(day); dayEnd.setHours(23, 59, 59, 999);
      if (bStart <= dayEnd && bEnd >= dayStart) {
        if (!blocksByDay[colIdx]) blocksByDay[colIdx] = [];
        blocksByDay[colIdx].push(block);
      }
    });
  }

  const BLOCK_LABELS: Record<string, string> = {
    vacation: "Vacaciones",
    break:    "Descanso",
    manual:   "Bloqueado",
  };

  return (
    <main className="pt-24 pb-32 px-4 max-w-5xl mx-auto animate-page">
      {/* ── Header ───────────────────────────────────────────────────── */}
      <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-ui text-[11px] font-medium tracking-widest text-primary uppercase">
            Agenda
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={prevWeek}
              className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center hover:bg-surface-raised border border-border-subtle transition-colors"
              aria-label="Semana anterior"
            >
              <ChevronLeftIcon className="w-4 h-4 text-on-surface-muted" />
            </button>
            <h2 className="font-cormorant font-normal text-[36px] text-on-surface tracking-tight italic">
              Semana {weekNum}
            </h2>
            <button
              onClick={nextWeek}
              className="w-9 h-9 rounded-full bg-surface-sunken flex items-center justify-center hover:bg-surface-raised border border-border-subtle transition-colors"
              aria-label="Semana siguiente"
            >
              <ChevronRightIcon className="w-4 h-4 text-on-surface-muted" />
            </button>
          </div>
        </div>

        <div className="flex bg-surface-sunken border border-border-subtle p-1 rounded-xl w-fit">
          <button
            onClick={() => setViewMode("weekly")}
            className={`px-5 py-2 rounded-lg font-ui text-[13px] font-medium transition-colors ${
              viewMode === "weekly"
                ? "bg-surface-raised text-primary shadow-sm"
                : "text-on-surface-muted hover:text-on-surface"
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-5 py-2 rounded-lg font-ui text-[13px] font-medium transition-colors ${
              viewMode === "monthly"
                ? "bg-surface-raised text-primary shadow-sm"
                : "text-on-surface-muted hover:text-on-surface"
            }`}
          >
            Mes
          </button>
        </div>
      </section>

      {/* ── Loading ──────────────────────────────────────────────────── */}
      {loading && (
        <div className="bg-surface border border-outline-variant/30 rounded-2xl shadow-sm overflow-hidden animate-pulse">
          <div className="grid grid-cols-8 border-b border-outline-variant/10 py-5 bg-surface-sunken/20">
            <div className="flex items-center justify-center">
               <div className="h-3 w-8 bg-outline-variant/10 rounded"></div>
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-3 w-6 bg-outline-variant/10 rounded mb-1"></div>
                <div className="h-6 w-6 bg-outline-variant/10 rounded-full"></div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-8">
            <div className="flex flex-col">
               {Array.from({ length: 5 }).map((_, i) => (
                 <div key={i} className="h-20 border-r border-outline-variant/10 flex items-start justify-center pt-2">
                   <div className="h-3 w-8 bg-outline-variant/10 rounded"></div>
                 </div>
               ))}
            </div>
            {Array.from({ length: 7 }).map((_, i) => (
               <div key={i} className="h-[400px] border-r border-outline-variant/10 last:border-r-0 relative">
                 <div className="absolute top-10 left-1 right-1 h-16 bg-outline-variant/10 rounded-lg"></div>
                 {i % 2 === 0 && <div className="absolute top-32 left-1 right-1 h-24 bg-outline-variant/10 rounded-lg"></div>}
               </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Calendar grid ────────────────────────────────────────────── */}
      {!loading && (
        <div className="bg-surface-raised border border-border-subtle rounded-2xl shadow-sm overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-border-subtle py-5 bg-surface-sunken/40">
            <div className="flex items-center justify-center font-ui text-[10px] font-medium text-on-surface-subtle uppercase tracking-widest">
              Hora
            </div>
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === todayStr;
              return (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className={`font-ui text-[11px] font-medium ${isToday ? "text-primary" : "text-on-surface-muted"}`}>
                    {DAY_ABBR[day.getDay()]}
                  </span>
                  <span
                    className={`font-ui text-[17px] font-medium ${
                      isToday
                        ? "w-8 h-8 flex items-center justify-center rounded-full bg-primary text-on-primary shadow-primary-sm"
                        : "text-on-surface"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-8 relative">
            {/* Time labels */}
            <div className="flex flex-col">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="flex items-start justify-center pt-2 font-mono-num text-[11px] font-medium text-on-surface-subtle border-r border-border-subtle"
                >
                  {h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, colIdx) => {
              const colApts   = aptsByDay[colIdx] ?? [];
              const totalHeight = HOURS.length * HOUR_HEIGHT;

              return (
                <div
                  key={colIdx}
                  className="relative border-r border-border-subtle last:border-r-0"
                  style={{ height: `${totalHeight}px` }}
                >
                  {/* Hour grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-b border-border-subtle/50"
                      style={{ top: `${(h - HOURS[0]) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    />
                  ))}

                  {/* Availability blocks */}
                  {(blocksByDay[colIdx] ?? []).map((block) => (
                    <div
                      key={block.id}
                      style={blockPositionStyle(block)}
                      className="z-[5] overflow-hidden"
                    >
                      <div className="w-full h-full bg-stone-100 border-l-[3px] border-stone-400 rounded-r flex flex-col justify-start gap-0.5 pt-1 px-1">
                        <NoSymbolIcon className="w-2.5 h-2.5 text-stone-400" />
                        <span className="font-ui text-[9px] text-stone-500 font-medium leading-tight uppercase tracking-tight hidden sm:block">
                          {BLOCK_LABELS[block.blockType] ?? "Bloqueado"}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Appointments */}
                  {colApts.map((apt) => {
                    const status = apt.status;
                    let bgClass = "";
                    let timeClass = "";
                    let titleClass = "";
                    let subtitleClass = "";

                    switch (status) {
                      case "confirmed":
                      case "reprogrammed":
                      case "rescheduled":
                        bgClass     = "bg-primary shadow-sm border border-primary/20";
                        timeClass   = "text-white/90 font-medium font-mono-num";
                        titleClass  = "text-white font-medium";
                        subtitleClass = "text-white/75";
                        break;
                      case "completed":
                        bgClass     = "bg-success shadow-sm border border-success/20";
                        timeClass   = "text-white/90 font-medium font-mono-num";
                        titleClass  = "text-white font-medium";
                        subtitleClass = "text-white/75";
                        break;
                      case "no_show":
                      case "cancelled":
                        bgClass     = "bg-error shadow-sm border border-error/20 opacity-80";
                        timeClass   = "text-white/90 font-medium font-mono-num";
                        titleClass  = "text-white font-medium";
                        subtitleClass = "text-white/75";
                        break;
                      case "pending":
                      default:
                        bgClass     = "bg-surface border-l-[3px] border-border shadow-sm";
                        timeClass   = "text-on-surface-muted font-medium font-mono-num";
                        titleClass  = "text-on-surface font-medium";
                        subtitleClass = "text-on-surface-muted";
                        break;
                    }

                    return (
                      <div
                        key={apt.id}
                        style={positionStyle(apt)}
                        className={`rounded-lg p-1.5 overflow-hidden z-10 transition-all ${bgClass}`}
                      >
                        <p className={`font-ui text-[10px] leading-tight mb-0.5 ${timeClass}`}>
                          {formatTimeES(apt.startTime)}
                        </p>
                        <p className={`font-ui text-[11px] leading-tight truncate ${titleClass}`}>
                          {apt.client?.name}
                        </p>
                        <p className={`font-ui text-[10px] leading-tight truncate ${subtitleClass}`}>
                          {apt.service?.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Legend ───────────────────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-4 px-1">
        {[
          { color: "bg-border",   label: "Pendiente"          },
          { color: "bg-primary",  label: "Confirmada"         },
          { color: "bg-success",  label: "Completada"         },
          { color: "bg-error",    label: "Cancelada / No-show" },
          { color: "bg-stone-400", label: "Bloqueado"         },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="font-ui text-[12px] text-on-surface-muted">{label}</span>
          </div>
        ))}
      </div>

      {/* ── FAB — block time ─────────────────────────────────────────── */}
      <button
        onClick={() => setShowBlockModal(true)}
        className="fixed bottom-44 right-6 w-12 h-12 rounded-full bg-surface-raised border border-border-subtle text-on-surface-muted shadow-sm flex items-center justify-center transition-transform active:scale-90 z-40 hover:border-border-focus musa-fab"
        title="Bloquear tiempo"
      >
        <NoSymbolIcon className="w-5 h-5" />
      </button>

      {/* ── FAB — new appointment ────────────────────────────────────── */}
      <button
        onClick={() => setShowNewAppointmentModal(true)}
        className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-primary text-on-primary shadow-primary-sm flex items-center justify-center transition-transform active:scale-90 z-40 hover:bg-primary-hover musa-fab"
        aria-label="Nueva cita"
      >
        <PlusIcon className="w-6 h-6" />
      </button>

      {/* Modals */}
      {showBlockModal && (
        <BlockTimeModal
          defaultDate={baseDate}
          onClose={() => setShowBlockModal(false)}
          onCreated={() => fetchBlocks(start, end)}
        />
      )}
      {showNewAppointmentModal && (
        <NewAppointmentModal
          onClose={() => setShowNewAppointmentModal(false)}
          onCreated={() => {
            setShowNewAppointmentModal(false);
            fetchByRange(start, end);
          }}
        />
      )}
    </main>
  );
}
