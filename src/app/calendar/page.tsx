"use client";

import { useEffect, useState } from "react";
import { useAppointments } from "@/hooks/useAppointments";
import { Appointment } from "@/types";
import { weekRange, formatTimeES, statusLabel } from "@/lib/utils";

const DAY_ABBR = ["DOM", "LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB"];
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
const HOUR_HEIGHT = 80; // px por hora

function getWeekDays(baseDate: Date): Date[] {
  const { start } = weekRange(baseDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

function positionStyle(apt: Appointment): React.CSSProperties {
  const start = new Date(apt.startTime);
  const end = new Date(apt.endTime);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const top = (startHour - HOURS[0]) * HOUR_HEIGHT;
  const height = (endHour - startHour) * HOUR_HEIGHT;
  return {
    top: `${Math.max(0, top)}px`,
    height: `${Math.max(20, height)}px`,
    position: "absolute",
    left: "2px",
    right: "2px",
  };
}

export default function Calendar() {
  const [viewMode, setViewMode] = useState<"weekly" | "monthly">("weekly");
  const [baseDate, setBaseDate] = useState(new Date());
  const weekDays = getWeekDays(baseDate);
  const { appointments, loading, fetchByRange } = useAppointments();

  const { start, end } = weekRange(baseDate);

  useEffect(() => {
    fetchByRange(start.toISOString(), end.toISOString());
  }, [baseDate, fetchByRange]);

  const todayStr = new Date().toDateString();

  const weekNum = Math.ceil(
    (baseDate.getDate() + new Date(baseDate.getFullYear(), baseDate.getMonth(), 1).getDay()) / 7
  );

  const prevWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() - 7);
    setBaseDate(d);
  };
  const nextWeek = () => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + 7);
    setBaseDate(d);
  };

  // Mapear citas a días (0=Lun, ..., 6=Dom en la semana)
  const aptsByDay: Record<number, Appointment[]> = {};
  for (const apt of appointments) {
    const d = new Date(apt.startTime);
    const dayOfWeek = d.getDay(); // 0=Dom
    // Convertir a índice de columna (0=Lun..6=Dom)
    const colIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    if (!aptsByDay[colIdx]) aptsByDay[colIdx] = [];
    aptsByDay[colIdx].push(apt);
  }

  const STATUS_COLORS: Record<string, string> = {
    confirmed: "from-primary to-primary-container",
    pending: "from-outline-variant to-outline-variant",
    completed: "from-tertiary to-tertiary",
    no_show: "from-error to-error",
    cancelled: "from-error to-error",
  };

  return (
    <main className="pt-24 pb-32 px-4 max-w-5xl mx-auto">
      {/* Header */}
      <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-on-surface-variant font-medium text-sm tracking-wider uppercase">
            Agenda
          </span>
          <div className="flex items-center gap-4">
            <button
              onClick={prevWeek}
              className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
              Semana {weekNum}
            </h2>
            <button
              onClick={nextWeek}
              className="w-9 h-9 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
        </div>
        <div className="flex bg-surface-container-low p-1.5 rounded-2xl w-fit">
          <button
            onClick={() => setViewMode("weekly")}
            className={`px-6 py-2 rounded-xl text-sm font-bold transition-colors ${viewMode === "weekly" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
          >
            Semana
          </button>
          <button
            onClick={() => setViewMode("monthly")}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-colors ${viewMode === "monthly" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-primary"}`}
          >
            Mes
          </button>
        </div>
      </section>

      {loading && (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary animate-spin text-3xl">
            progress_activity
          </span>
        </div>
      )}

      {!loading && (
        <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-2xl shadow-zinc-900/5 overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-8 border-b border-surface-container py-6 bg-surface-container-low/30">
            <div className="flex items-center justify-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Hora
            </div>
            {weekDays.map((day, i) => {
              const isToday = day.toDateString() === todayStr;
              return (
                <div key={i} className={`flex flex-col items-center gap-1 ${!weekDays.some((d) => [5, 6].includes(i)) ? "" : "opacity-50"}`}>
                  <span className={`text-[11px] font-semibold ${isToday ? "text-primary font-bold" : "text-on-surface-variant"}`}>
                    {DAY_ABBR[day.getDay()]}
                  </span>
                  <span
                    className={`text-lg font-headline font-bold ${isToday ? "w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white" : "text-on-surface"}`}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time Grid */}
          <div className="grid grid-cols-8 relative">
            {/* Time Labels */}
            <div className="flex flex-col">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: `${HOUR_HEIGHT}px` }}
                  className="flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container"
                >
                  {h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
                </div>
              ))}
            </div>

            {/* Day Columns */}
            {weekDays.map((day, colIdx) => {
              const colApts = aptsByDay[colIdx === 6 ? 6 : colIdx] ?? [];
              const totalHeight = HOURS.length * HOUR_HEIGHT;

              return (
                <div
                  key={colIdx}
                  className="relative border-r border-surface-container last:border-r-0"
                  style={{ height: `${totalHeight}px` }}
                >
                  {/* Grid lines */}
                  {HOURS.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-b border-surface-container-low"
                      style={{ top: `${(h - HOURS[0]) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}
                    />
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
                        bgClass = "bg-primary shadow-md border border-primary/20";
                        timeClass = "text-white/90 font-bold";
                        titleClass = "text-white font-black";
                        subtitleClass = "text-white/80";
                        break;
                      case "completed":
                        bgClass = "bg-tertiary shadow-md border border-tertiary/20";
                        timeClass = "text-white/90 font-bold";
                        titleClass = "text-white font-black";
                        subtitleClass = "text-white/80";
                        break;
                      case "no_show":
                      case "cancelled":
                        bgClass = "bg-error shadow-md border border-error/20 opacity-90";
                        timeClass = "text-white/90 font-bold";
                        titleClass = "text-white font-black";
                        subtitleClass = "text-white/80";
                        break;
                      case "pending":
                      default:
                        bgClass = "bg-surface-container-lowest border-l-4 border-outline-variant shadow-sm";
                        timeClass = "text-on-surface-variant font-bold";
                        titleClass = "text-on-surface font-black";
                        subtitleClass = "text-on-surface-variant";
                        break;
                    }
                    
                    return (
                      <div
                        key={apt.id}
                        style={positionStyle(apt)}
                        className={`rounded-xl p-2 overflow-hidden z-10 transition-all ${bgClass}`}
                      >
                        <p className={`text-[10px] leading-tight mb-0.5 ${timeClass}`}>
                          {formatTimeES(apt.startTime)}
                        </p>
                        <p className={`text-[11px] leading-tight truncate ${titleClass}`}>
                          {apt.client?.name}
                        </p>
                        <p className={`text-[10px] font-medium leading-tight truncate ${subtitleClass}`}>
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

      {/* Legend */}
      <div className="mt-8 flex flex-wrap items-center gap-4 md:gap-6 px-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-outline-variant"></div>
          <span className="text-xs font-medium text-on-surface-variant">Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span className="text-xs font-medium text-on-surface-variant">Confirmada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-tertiary"></div>
          <span className="text-xs font-medium text-on-surface-variant">Completada</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-error"></div>
          <span className="text-xs font-medium text-on-surface-variant">Cancelada / No-show</span>
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-xl shadow-purple-500/30 flex items-center justify-center transition-transform active:scale-90 z-40">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </main>
  );
}
