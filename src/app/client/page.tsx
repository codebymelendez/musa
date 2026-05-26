"use client";

import { CalendarDaysIcon, MagnifyingGlassIcon, TagIcon, QrCodeIcon, ArrowPathIcon, PencilSquareIcon, HomeIcon, ArrowRightOnRectangleIcon, StarIcon } from "@heroicons/react/24/outline";

import { useEffect, useState, lazy, Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatTimeES } from "@/lib/utils";
import GoogleSignInButton from "@/components/GoogleSignInButton";
import MusaLogo from "@/components/brand/MusaLogo";

const QRDisplay = lazy(() => import("@/components/loyalty/QRDisplay"));

interface LoyaltyAccountSummary {
  id: string;
  totalPoints: number;
  lifetimePoints: number;
  qrToken: string;
  program: { name: string; rewardThreshold: number; rewardDescription: string; isActive: boolean } | null;
  business: { name: string; logoUrl: string | null } | null;
}

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
  const [loyaltyAccounts, setLoyaltyAccounts] = useState<LoyaltyAccountSummary[]>([]);
  const [eligibleBusinesses, setEligibleBusinesses] = useState<{ businessId: string; businessName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upcoming" | "past" | "loyalty">("upcoming");
  const [showQRFor, setShowQRFor] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState<string | null>(null);

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
        .then(() => {
          // Cargar loyalty accounts en paralelo
          return fetch("/api/client/loyalty", {
            headers: { Authorization: `Bearer ${t}` },
          })
            .then((r) => r.json())
            .then((d) => {
              setLoyaltyAccounts(d.accounts ?? []);
              setEligibleBusinesses(d.eligible ?? []);
            })
            .catch(() => {}); // No bloquear si loyalty falla
        })
        .catch(() => setError("Error al cargar tus citas"))
        .finally(() => setLoading(false));
    }
  }, []);

  const handleEnroll = async (businessId: string) => {
    if (!token) return;
    setEnrolling(businessId);
    try {
      const res = await fetch("/api/client/loyalty/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ businessId }),
      });
      if (res.ok) {
        // Recargar cuentas de loyalty
        const r = await fetch("/api/client/loyalty", { headers: { Authorization: `Bearer ${token}` } });
        const d = await r.json();
        setLoyaltyAccounts(d.accounts ?? []);
        setEligibleBusinesses(d.eligible ?? []);
      }
    } catch {
      // silent
    } finally {
      setEnrolling(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("musa_client_token");
    localStorage.removeItem("musa_client_name");
    setToken(null);
    setClientName(null);
    setUpcoming([]);
    setPast([]);
  };

  // ── No autenticado — acceso inline (Google + form) ────────────────────────
  if (!token) {
    return <ClientAccessView onSuccess={(t, n) => { setToken(t); setClientName(n); }} />;
  }

  // ── Autenticado ────────────────────────────────────────────────────────────
  const displayAppointments = tab === "upcoming" ? upcoming : (tab === "past" ? past : []);

  return (
    <div className="min-h-screen bg-background font-body antialiased pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle px-5 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
          {clientName?.charAt(0).toUpperCase() ?? "C"}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-headline text-base font-medium text-on-surface truncate">
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
            className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary text-sm font-medium rounded-2xl py-3 hover:bg-primary/20 transition-colors"
          >
            <MagnifyingGlassIcon className="w-4 h-4" />
            Nueva reserva
          </Link>
          <Link
            href="/"
            className="flex-1 flex items-center justify-center gap-2 bg-surface border border-outline-variant/30 text-on-surface-variant text-sm font-medium rounded-2xl py-3 hover:bg-surface-container transition-colors"
          >
            <TagIcon className="w-4 h-4" />
            Ofertas
          </Link>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface border border-outline-variant/30 rounded-2xl p-1 mb-5">
          {(["upcoming", "past", "loyalty"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                tab === t
                  ? "bg-white text-on-surface shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {t === "upcoming"
                ? `Próximas (${upcoming.length})`
                : t === "past"
                ? `Historial`
                : `Mis puntos${loyaltyAccounts.length > 0 ? ` (${loyaltyAccounts.length})` : ""}`}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* ── Loyalty tab ── */}
        {tab === "loyalty" && (
          <div className="space-y-4">
            {loyaltyAccounts.length === 0 && eligibleBusinesses.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <span className="text-4xl">⭐</span>
                <p className="text-sm text-on-surface-variant">
                  Aún no tienes puntos de fidelización.
                </p>
                <p className="text-xs text-on-surface-variant">
                  Completa citas en negocios que tengan programa de fidelización activo.
                </p>
              </div>
            ) : (
              loyaltyAccounts.map((acc) => {
                const prog = acc.program;
                const threshold = prog?.rewardThreshold ?? 10;
                const progress = Math.min((acc.totalPoints / threshold) * 100, 100);
                const canRedeem = acc.totalPoints >= threshold && prog?.isActive;
                return (
                  <div
                    key={acc.id}
                    className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 space-y-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-on-surface text-sm">
                          {acc.business?.name ?? "Negocio"}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                          {prog?.name ?? "Programa de fidelización"}
                        </p>
                      </div>
                      {canRedeem && (
                        <span className="text-[10px] font-medium bg-green-100 text-green-700 px-2 py-1 rounded-full flex-shrink-0">
                          ¡Lista!
                        </span>
                      )}
                    </div>

                    {/* Points progress */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-end">
                        <span className="font-cormorant font-normal text-[32px] text-on-surface">
                          {acc.totalPoints}
                        </span>
                        <span className="text-xs text-on-surface-variant mb-0.5">
                          / {threshold}
                        </span>
                      </div>
                      <div className="h-2 bg-surface border border-outline-variant/30 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${canRedeem ? "bg-green-500" : "bg-primary"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <p className="text-xs text-on-surface-variant">
                        {canRedeem
                          ? prog?.rewardDescription
                          : `Faltan ${threshold - acc.totalPoints} para tu recompensa`}
                      </p>
                    </div>

                    {/* QR */}
                    <button
                      onClick={() => setShowQRFor(showQRFor === acc.id ? null : acc.id)}
                      className="w-full h-10 flex items-center justify-center gap-2 bg-surface-container text-on-surface-variant text-xs font-medium rounded-xl hover:bg-surface border border-outline-variant/30 transition-colors"
                    >
                      <QrCodeIcon className="w-4 h-4" />
                      {showQRFor === acc.id ? "Ocultar QR" : "Mostrar mi QR"}
                    </button>

                    {showQRFor === acc.id && (
                      <Suspense fallback={<div className="h-48 animate-pulse bg-surface border border-outline-variant/30 rounded-2xl" />}>
                        <div className="flex justify-center pt-2">
                          <QRDisplay token={acc.qrToken} size={180} />
                        </div>
                      </Suspense>
                    )}
                  </div>
                );
              })
            )}

            {/* Negocios donde puede inscribirse */}
            {eligibleBusinesses.length > 0 && (
              <div className="space-y-3">
                {loyaltyAccounts.length > 0 && (
                  <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider px-1">
                    También disponible
                  </p>
                )}
                {eligibleBusinesses.map((biz) => (
                  <div
                    key={biz.businessId}
                    className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-outline-variant/10 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center flex-shrink-0">
                      <StarIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-on-surface text-sm truncate">{biz.businessName}</p>
                      <p className="text-xs text-on-surface-variant">Tienes puntos pendientes — obtén tu QR</p>
                    </div>
                    <button
                      onClick={() => handleEnroll(biz.businessId)}
                      disabled={enrolling === biz.businessId}
                      className="flex-shrink-0 h-9 px-4 bg-primary text-white text-xs font-medium rounded-full disabled:opacity-50 flex items-center gap-1 hover:bg-primary/90 transition-colors"
                    >
                      {enrolling === biz.businessId ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <QrCodeIcon className="w-4 h-4" />
                          Mi QR
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Appointments (solo tabs de citas) */}
        {tab !== "loyalty" && (loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="h-28 bg-surface border border-outline-variant/30 rounded-2xl animate-pulse" />
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
              <Link href="/explore" className="text-sm font-medium text-primary hover:underline">
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
                    <div className="w-12 h-12 rounded-2xl bg-surface border border-outline-variant/30 overflow-hidden relative flex-shrink-0">
                      {appt.user.avatarUrl ? (
                        <Image
                          src={appt.user.avatarUrl}
                          alt={appt.user.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">
                          💅
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-on-surface text-sm truncate">{bizName}</p>
                      <p className="text-xs text-on-surface-variant">
                        {appt.user.name}{city ? ` · ${city}` : ""}
                      </p>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusMeta.color}`}>
                      {statusMeta.label}
                    </span>
                  </div>

                  {/* Appointment details */}
                  <div className="bg-surface-container rounded-xl px-4 py-3 space-y-1">
                    <p className="font-medium text-on-surface text-sm">{appt.service.name}</p>
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
                        className="flex-1 h-10 bg-primary text-white text-xs font-medium rounded-xl flex items-center justify-center gap-1 hover:bg-primary/90 transition-colors"
                      >
                        <PencilSquareIcon className="w-4 h-4" />
                        Gestionar cita
                      </Link>
                    ) : (
                      <Link
                        href={`/p/${appt.user.slug}`}
                        className="flex-1 h-10 bg-primary/10 text-primary text-xs font-medium rounded-xl flex items-center justify-center gap-1 hover:bg-primary/20 transition-colors"
                      >
                        <CalendarDaysIcon className="w-4 h-4" />
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
        ))}
      </main>

      {/* Client bottom nav */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] rounded-t-[2rem] z-50">
        <Link
          href="/"
          className="flex flex-col items-center justify-center px-4 py-2 text-zinc-400 hover:text-primary transition-colors"
        >
          <HomeIcon className="w-6 h-6 mb-1" />
          <span className="font-headline text-[10px] font-medium tracking-wide uppercase">Inicio</span>
        </Link>
        <Link
          href="/explore"
          className="flex flex-col items-center justify-center px-4 py-2 text-zinc-400 hover:text-primary transition-colors"
        >
          <MagnifyingGlassIcon className="w-6 h-6 mb-1" />
          <span className="font-headline text-[10px] font-medium tracking-wide uppercase">Explorar</span>
        </Link>
        <Link
          href="/client"
          className="flex flex-col items-center justify-center px-4 py-2 bg-primary/10 text-primary rounded-full transition-colors"
        >
          <CalendarDaysIcon className="w-6 h-6 mb-1" />
          <span className="font-headline text-[10px] font-medium tracking-wide uppercase">Mis Citas</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center px-4 py-2 text-zinc-400 hover:text-red-500 transition-colors"
        >
          <ArrowRightOnRectangleIcon className="w-6 h-6 mb-1" />
          <span className="font-headline text-[10px] font-medium tracking-wide uppercase">Salir</span>
        </button>
      </nav>
    </div>
  );
}

// ── Pantalla de acceso inline (sin redirect) ──────────────────────────────────
function ClientAccessView({
  onSuccess,
}: {
  onSuccess: (token: string, name: string) => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/client/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos verificar tu identidad");
        return;
      }
      localStorage.setItem("musa_client_token", data.token);
      localStorage.setItem("musa_client_name", data.clientName);
      onSuccess(data.token, data.clientName);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-100 font-ui antialiased flex flex-col items-center justify-center px-5 py-12 relative">
      {/* Dot grid subtle */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #1A0E0B 1px, transparent 0)",
          backgroundSize: "24px 24px",
        }}
      />

      <main className="relative w-full max-w-[380px] space-y-7 z-10">
        {/* Brand */}
        <header className="space-y-4">
          <Link
            href="/"
            className="flex items-center gap-1.5 font-ui text-[13px] text-on-surface-subtle hover:text-on-surface-muted transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Inicio
          </Link>
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <MusaLogo variant="combo" size="md" />
            </div>
            <p className="font-display font-normal italic text-on-surface text-[22px]" style={{ letterSpacing: "-0.01em" }}>
              Tus citas, aquí.
            </p>
            <p className="font-ui text-[14px] text-on-surface-muted">
              Accede a tus reservas y gestiona tus citas.
            </p>
          </div>
        </header>

        {/* Card */}
        <section className="bg-surface-raised border border-border-subtle rounded-2xl p-7 shadow-md space-y-5">
          {error && (
            <div className="bg-error-surface border border-error/20 rounded-lg px-4 py-3">
              <p className="font-ui text-[13px] text-error leading-snug">{error}</p>
            </div>
          )}

          {/* Google */}
          <GoogleSignInButton
            label="Continuar con Google"
            defaultRole="client"
            onError={(msg) => setError(msg)}
          />

          {/* Separador */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border-subtle" />
            <span className="font-ui text-[11px] text-on-surface-subtle">o con tu teléfono</span>
            <div className="flex-1 h-px bg-border-subtle" />
          </div>

          {/* Form teléfono + nombre */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="ca-phone" className="musa-sublabel">Teléfono *</label>
              <input
                id="ca-phone"
                className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                type="tel"
                placeholder="+58 424 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="ca-name" className="musa-sublabel">Tu nombre *</label>
              <input
                id="ca-name"
                className="w-full h-11 px-3.5 bg-surface-sunken border border-border rounded-md font-ui text-[15px] text-on-surface placeholder:text-on-surface-subtle outline-none transition-all focus:border-border-focus focus:bg-surface-raised focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]"
                type="text"
                placeholder="Como te conocemos"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
              <p className="font-ui text-[11px] text-on-surface-subtle px-0.5">
                Tu nombre se usa para confirmar tu identidad, sin contraseña.
              </p>
            </div>
            <button
              type="submit"
              disabled={!phone || !name || loading}
              className="w-full h-11 bg-primary text-on-primary font-ui font-medium text-[14px] rounded-full flex items-center justify-center gap-2 shadow-primary-sm hover:bg-primary-hover transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border border-on-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CalendarDaysIcon className="w-4 h-4" />
                  Ver mis citas
                </>
              )}
            </button>
          </form>
        </section>

        {/* Crear perfil */}
        <p className="text-center font-ui text-[13px] text-on-surface-muted">
          ¿Primera vez?{" "}
          <Link href="/client/register" className="text-primary hover:underline font-medium">
            Crea tu perfil
          </Link>
          {" "}para guardar tus datos.
        </p>

        {/* Explorar */}
        <div className="text-center">
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 font-ui text-[13px] text-on-surface-subtle hover:text-on-surface transition-colors"
          >
            <MagnifyingGlassIcon className="w-3.5 h-3.5" />
            Explorar profesionales
          </Link>
        </div>
      </main>
    </div>
  );
}
