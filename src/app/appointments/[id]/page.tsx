"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  PencilIcon,
  CalendarDaysIcon,
  ClockIcon,
  PhoneIcon,
  ChatBubbleLeftIcon,
  CheckCircleIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "@/hooks/useAuth";
import { formatTimeES, formatDateES, formatCurrency, statusLabel } from "@/lib/utils";
import { useAppointments } from "@/hooks/useAppointments";
import { Appointment } from "@/types";

const STATUS_DOT: Record<string, string> = {
  pending:     "bg-border",
  confirmed:   "bg-primary",
  completed:   "bg-success",
  cancelled:   "bg-error",
  no_show:     "bg-error",
  rescheduled: "bg-warning",
};

const STATUS_TEXT: Record<string, string> = {
  pending:     "text-on-surface-muted",
  confirmed:   "text-primary",
  completed:   "text-success",
  cancelled:   "text-error",
  no_show:     "text-error",
  rescheduled: "text-warning",
};

function getInitials(name: string) {
  return name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default function AppointmentDetailPage() {
  const { user } = useAuth();
  const tz = user?.business?.timezone || "America/Caracas";
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { updateStatus } = useAppointments();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updating, setUpdating]       = useState(false);

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

  const handleStatusUpdate = async (newStatus: string) => {
    if (!appointment) return;
    setUpdating(true);
    setActionError(null);
    try {
      await updateStatus(appointment.id, newStatus as Appointment["status"]);
      setAppointment({ ...appointment, status: newStatus as Appointment["status"] });
    } catch {
      setActionError("No se pudo actualizar el estado. Intenta de nuevo.");
    } finally {
      setUpdating(false);
    }
  };

  /* ── Loading skeleton ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-32 animate-page">
        <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle">
          <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-surface-sunken animate-pulse" />
            <div className="w-28 h-4 rounded bg-surface-sunken animate-pulse" />
          </div>
        </header>
        <main className="max-w-2xl mx-auto px-5 pt-8 space-y-6">
          <div className="space-y-3">
            <div className="w-16 h-3 rounded bg-surface-sunken animate-pulse" />
            <div className="w-60 h-8 rounded bg-surface-sunken animate-pulse" />
            <div className="w-36 h-4 rounded bg-surface-sunken animate-pulse" />
          </div>
          <div className="h-px bg-border-subtle" />
          {[50, 65, 40].map((w, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-[18px] h-[18px] rounded bg-surface-sunken animate-pulse mt-0.5 flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 rounded bg-surface-sunken animate-pulse" style={{ width: `${w}%` }} />
                <div className="h-3 rounded bg-surface-sunken animate-pulse" style={{ width: `${w - 15}%` }} />
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  /* ── Error / not found ────────────────────────────────────────────── */
  if (error || !appointment) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <p
          className="font-display italic font-light text-on-surface mb-2"
          style={{ fontSize: "28px" }}
        >
          Cita no encontrada.
        </p>
        <p className="font-ui text-[13px] text-on-surface-muted mb-8">
          {error ?? "No pudimos cargar esta cita."}
        </p>
        <Link
          href="/appointments"
          className="font-ui text-[13px] text-primary hover:underline underline-offset-4"
        >
          Volver a las citas
        </Link>
      </div>
    );
  }

  const dot        = STATUS_DOT[appointment.status]  ?? "bg-border";
  const textColor  = STATUS_TEXT[appointment.status] ?? "text-on-surface-muted";
  const label      = statusLabel(appointment.status);
  const isActive   = !["completed", "cancelled", "no_show"].includes(appointment.status);
  const isDone     = appointment.status === "completed";

  return (
    <div className="min-h-screen bg-background pb-32 animate-page">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
            aria-label="Volver"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-[18px] font-light italic text-on-surface leading-none">
              Detalle de cita
            </h1>
            <p className="text-[10px] text-on-surface-subtle mt-1">
              Zona horaria: {tz}
            </p>
          </div>
          <Link
            href={`/appointments/${appointment.id}/edit`}
            className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
            aria-label="Editar cita"
          >
            <PencilIcon className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 pt-8 space-y-8">

        {/* ── Hero: status + client name + service ─────────────────── */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-[7px] h-[7px] rounded-full flex-shrink-0 ${dot}`} />
            <span className={`font-ui text-[12px] font-medium ${textColor}`}>{label}</span>
          </div>

          <h2
            className="font-display font-light italic text-on-surface leading-[1.05] mb-1"
            style={{ fontSize: "clamp(28px, 7vw, 36px)" }}
          >
            {appointment.client?.name ?? "Sin cliente"}
          </h2>
          <p className="font-ui text-[14px] text-on-surface-muted">
            {appointment.service?.name}
          </p>

          {/* MUSA signature rule */}
          <div className="mt-5 space-y-[3px]">
            <div className="h-px bg-primary opacity-35 w-full" />
            <div className="h-[0.5px] bg-[#C4996A] opacity-40" style={{ width: "55%" }} />
          </div>
        </div>

        {/* ── Appointment details ───────────────────────────────────── */}
        <div className="space-y-5">
          <div className="flex items-start gap-4">
            <CalendarDaysIcon className="w-[18px] h-[18px] text-on-surface-subtle mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-ui text-[14px] text-on-surface capitalize">
                {formatDateES(new Date(appointment.startTime), tz)}
              </p>
              <p
                className="text-[13px] text-on-surface-muted mt-px"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {formatTimeES(appointment.startTime, tz)} → {formatTimeES(appointment.endTime, tz)}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <ClockIcon className="w-[18px] h-[18px] text-on-surface-subtle mt-0.5 flex-shrink-0" />
            <div className="flex items-baseline gap-3">
              <p className="font-ui text-[14px] text-on-surface">
                {appointment.service?.durationMin} min
              </p>
              {appointment.service?.price != null && (
                <>
                  <span className="text-on-surface-subtle text-[11px]">·</span>
                  <p
                    className="text-[14px] text-on-surface font-medium"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {formatCurrency(appointment.service.price)}
                  </p>
                </>
              )}
            </div>
          </div>

          {appointment.notes && (
            <div className="flex items-start gap-4">
              <ChatBubbleLeftIcon className="w-[18px] h-[18px] text-on-surface-subtle mt-0.5 flex-shrink-0" />
              <p className="font-ui text-[13px] text-on-surface-muted italic leading-relaxed">
                &ldquo;{appointment.notes}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* ── Divider ──────────────────────────────────────────────────── */}
        <div className="h-px bg-border-subtle" />

        {/* ── Contact ──────────────────────────────────────────────────── */}
        <div>
          <p
            className="font-display font-light uppercase tracking-[0.18em] text-on-surface-subtle mb-4"
            style={{ fontSize: "10px" }}
          >
            Contacto
          </p>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-sunken flex items-center justify-center font-ui font-medium text-[13px] text-on-surface-muted flex-shrink-0">
              {appointment.client?.name
                ? getInitials(appointment.client.name)
                : <UserIcon className="w-4 h-4" />}
            </div>
            <div>
              <p className="font-ui text-[14px] font-medium text-on-surface">
                {appointment.client?.name}
              </p>
              {appointment.client?.phone && (
                <p
                  className="text-[12px] text-on-surface-muted mt-px"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {appointment.client.phone}
                </p>
              )}
            </div>
          </div>

          {appointment.client?.phone && (
            <div className="flex gap-2">
              <a
                href={`tel:${appointment.client.phone}`}
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-surface-sunken text-on-surface-muted font-ui text-[13px] font-medium rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <PhoneIcon className="w-4 h-4" />
                Llamar
              </a>
              <a
                href={`https://wa.me/${appointment.client.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 h-10 bg-surface-sunken text-on-surface-muted font-ui text-[13px] font-medium rounded-lg hover:text-[#128C7E] transition-colors"
              >
                <ChatBubbleLeftIcon className="w-4 h-4" />
                WhatsApp
              </a>
            </div>
          )}
        </div>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        {isActive && (
          <>
            <div className="h-px bg-border-subtle" />
            <div className="space-y-3">
              {actionError && (
                <p className="font-ui text-[12px] text-error text-center">{actionError}</p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleStatusUpdate("completed")}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 h-11 bg-success text-white font-ui text-[13px] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  {updating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircleIcon className="w-4 h-4" />
                  )}
                  Completada
                </button>
                <button
                  onClick={() => handleStatusUpdate("no_show")}
                  disabled={updating}
                  className="flex items-center justify-center gap-2 h-11 bg-error-surface text-error font-ui text-[13px] font-semibold rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40"
                >
                  No asistió
                </button>
              </div>

              <button
                onClick={() => handleStatusUpdate("cancelled")}
                disabled={updating}
                className="w-full font-ui text-[13px] text-error text-center py-2 hover:underline underline-offset-4 transition-colors disabled:opacity-40"
              >
                Cancelar cita
              </button>
            </div>
          </>
        )}

        {/* ── Closed state notice ───────────────────────────────────── */}
        {!isActive && (
          <>
            <div className="h-px bg-border-subtle" />
            <p className="font-ui text-[12px] text-on-surface-subtle text-center py-2">
              {isDone ? "Esta cita fue completada." : "Esta cita fue cancelada o no se presentó."}
            </p>
          </>
        )}

      </main>
    </div>
  );
}
