"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatTimeES } from "@/lib/utils";

interface BookingAppointment {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  rescheduleToken: string | null;
  service: { name: string; durationMin: number; price: number; currency: string };
  user: {
    name: string;
    slug: string;
    avatarUrl: string | null;
    serviceType: string | null;
    whatsapp: string | null;
    business: { name: string; city: string | null } | null;
  };
  client: { name: string; phone: string };
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  confirmed:  { label: "Confirmada",  color: "bg-green-100 text-green-700" },
  pending:    { label: "Pendiente",   color: "bg-yellow-100 text-yellow-700" },
  completed:  { label: "Realizada",   color: "bg-surface-container text-on-surface-variant" },
  cancelled:  { label: "Cancelada",   color: "bg-red-100 text-red-600" },
  no_show:    { label: "No asistí",   color: "bg-orange-100 text-orange-700" },
};

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("es-VE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default function ClientPortalPage() {
  const [token, setToken] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [upcoming, setUpcoming] = useState<BookingAppointment[]>([]);
  const [past, setPast] = useState<BookingAppointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    const t = localStorage.getItem("musa_client_token");
    const n = localStorage.getItem("musa_client_name");
    setToken(t);
    setClientName(n);

    if (t) {
      setLoading(true);
      fetch("/api/client/bookings", {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.error) {
            setError(d.error);
            localStorage.removeItem("musa_client_token");
            setToken(null);
            return;
          }
          setUpcoming(d.upcoming ?? []);
          setPast(d.past ?? []);
          if (d.clientName) setClientName(d.clientName);
        })
        .catch(() => setError("Error al cargar tus citas"))
        .finally(() => setLoading(false));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("musa_client_token");
    localStorage.removeItem("musa_client_name");
    setToken(null);
    setClientName(null);
    setUpcoming([]);
    setPast([]);
  };

  // ── No autenticado ─────────────────────────────────────────────────────────
  if (!token) {
    return (
      <div className="min-h-screen bg-background font-body antialiased">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg px-6 py-4 flex items-center gap-3 shadow-sm shadow-purple-500/5">
          <Link href="/" className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="font-headline text-lg font-bold text-on-surface">Área de clientas</h1>
        </header>

        <main className="px-6 pt-12 pb-16 max-w-sm mx-auto space-y-8 text-center">
          <div className="space-y-3">
            <div className="text-5xl">💅</div>
            <h2 className="font-headline text-2xl font-extrabold tracking-tighter text-on-surface" suppressHydrationWarning>
              {clientName ? `¡Hola, ${clientName}!` : "Tu espacio de belleza"}
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Accede a tus citas, historial de visitas y ofertas exclusivas de tus profesionales favoritas.
            </p>
          </div>

          <div className="space-y-3">
            <Link
              href="/client/login"
              className="flex items-center justify-center gap-2 w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-headline font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
              Ver mis citas
            </Link>
            <Link
              href="/client/register"
              className="flex items-center justify-center gap-2 w-full h-14 bg-surface-container-high text-on-surface font-headline font-bold rounded-full hover:bg-surface-container transition-colors"
            >
              Crear perfil de clienta
            </Link>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-3 text-xs text-on-surface-variant">o descubre profesionales</span>
            </div>
          </div>

          <Link
            href="/explore"
            className="flex items-center justify-center gap-2 text-sm font-bold text-primary hover:underline"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            Explorar profesionales cerca
          </Link>
        </main>
      </div>
    );
  }

  // ── Autenticado ────────────────────────────────────────────────────────────
  const displayAppointments = tab === "upcoming" ? upcoming : past;

  return (
    <div className="min-h-screen bg-background font-body antialiased pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg px-6 py-4 flex items-center gap-3 shadow-sm shadow-purple-500/5">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {clientName?.charAt(0).toUpperCase() ?? "C"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline text-base font-bold text-on-surface truncate">
            Hola, {clientName} 👋
          </h1>
          <p className="text-xs text-on-surface-variant">
            {upcoming.length > 0
              ? `${upcoming.length} cita${upcoming.length !== 1 ? "s" : ""} próxima${upcoming.length !== 1 ? "s" : ""}`
              : "Sin citas próximas"}
          </p>
        </div>
      </header>

      <main className="px-4 max-w-2xl mx-auto">
        {/* Quick actions */}
        <div className="py-5 flex gap-3">
          <Link
            href="/explore"
            className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary text-sm font-bold rounded-2xl py-3 hover:bg-primary/20 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">search</span>
            Nueva reserva
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-surface-container-high text-on-surface-variant text-sm font-bold rounded-2xl py-3 hover:bg-surface-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">local_offer</span>
            Ofertas
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-container-high rounded-2xl p-1 mb-5">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                tab === t
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t === "upcoming" ? `Próximas (${upcoming.length})` : `Historial (${past.length})`}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-surface-container-high rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : displayAppointments.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <span className="text-4xl">{tab === "upcoming" ? "🗓️" : "✨"}</span>
            <p className="text-sm text-on-surface-variant">
              {tab === "upcoming"
                ? "No tienes citas próximas"
                : "No hay citas en tu historial"}
            </p>
            {tab === "upcoming" && (
              <Link href="/explore" className="text-sm font-bold text-primary hover:underline">
                Reservar ahora →
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {displayAppointments.map((appt) => {
              const statusMeta = STATUS_LABEL[appt.status] ?? STATUS_LABEL.confirmed;
              const bizName = appt.user.business?.name ?? appt.user.name;
              const city = appt.user.business?.city;

              return (
                <div
                  key={appt.id}
                  className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-4"
                >
                  {/* Professional info */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-high overflow-hidden relative flex-shrink-0">
                      {appt.user.avatarUrl ? (
                        <Image
                          src={appt.user.avatarUrl}
                          alt={appt.user.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          💅
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-on-surface text-sm truncate">{bizName}</p>
                      <p className="text-xs text-on-surface-variant">
                        {appt.user.name}{city ? ` · ${city}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Appointment details */}
                  <div className="bg-surface-container rounded-xl px-4 py-3 space-y-1">
                    <p className="font-bold text-on-surface text-sm">{appt.service.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {formatDateShort(appt.startTime)} · {formatTimeES(appt.startTime)} ·{" "}
                      {appt.service.durationMin} min
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {appt.rescheduleToken && !["cancelled", "completed", "no_show"].includes(appt.status) ? (
                      <Link
                        href={`/cita/${appt.rescheduleToken}`}
                        className="flex-1 h-10 bg-primary text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">edit_calendar</span>
                        Gestionar cita
                      </Link>
                    ) : (
                      <Link
                        href={`/p/${appt.user.slug}`}
                        className="flex-1 h-10 bg-primary/10 text-primary text-xs font-bold rounded-xl flex items-center justify-center gap-1 hover:bg-primary/20 transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">calendar_add_on</span>
                        Reservar de nuevo
                      </Link>
                    )}
                    {appt.user.whatsapp && appt.status !== "cancelled" && (
                      <a
                        href={`https://wa.me/${appt.user.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${appt.user.name}, quisiera consultar sobre mi cita.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 bg-[#25D366]/10 text-[#25D366] rounded-xl flex items-center justify-center hover:bg-[#25D366]/20 transition-colors flex-shrink-0"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                        </svg>
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Client bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] rounded-t-[2rem] z-50">
        <Link
          href="/"
          className="flex flex-col items-center justify-center px-4 py-2 text-zinc-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined mb-1 text-[24px]">home</span>
          <span className="font-headline text-[10px] font-bold tracking-wide uppercase">Inicio</span>
        </Link>
        <Link
          href="/explore"
          className="flex flex-col items-center justify-center px-4 py-2 text-zinc-400 hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined mb-1 text-[24px]">search</span>
          <span className="font-headline text-[10px] font-bold tracking-wide uppercase">Explorar</span>
        </Link>
        <Link
          href="/client"
          className="flex flex-col items-center justify-center px-4 py-2 bg-purple-100 text-purple-900 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined mb-1 text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_today</span>
          <span className="font-headline text-[10px] font-bold tracking-wide uppercase">Mis Citas</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center px-4 py-2 text-zinc-400 hover:text-red-500 transition-colors"
        >
          <span className="material-symbols-outlined mb-1 text-[24px]">logout</span>
          <span className="font-headline text-[10px] font-bold tracking-wide uppercase">Salir</span>
        </button>
      </nav>
    </div>
  );
}
