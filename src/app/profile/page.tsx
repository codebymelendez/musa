"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { User, ProfessionalSettings } from "@/types";
import { formatCurrency } from "@/lib/utils";
import ImageUploader from "@/components/ui/ImageUploader";
import {
  PencilIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowRightIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  ChatBubbleLeftEllipsisIcon,
  StarIcon,
  ArrowRightStartOnRectangleIcon,
} from "@heroicons/react/24/outline";

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export default function Profile() {
  const { user: storeUser, logout, loadUser } = useAuth();
  const { setUser } = useAppStore();
  const router = useRouter();
  const [user, setLocalUser] = useState<User | null>(storeUser);
  const [editMode, setEditMode] = useState<"none" | "profile" | "hours" | "contact" | "business">("none");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formWhatsapp, setFormWhatsapp] = useState("");
  const [formInstagram, setFormInstagram] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formStartHour, setFormStartHour] = useState(9);
  const [formEndHour, setFormEndHour] = useState(18);
  const [formWorkDays, setFormWorkDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [formBusinessName, setFormBusinessName] = useState("");
  const [formCity, setFormCity] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      const u = await loadUser();
      if (u) {
        setLocalUser(u);
        setUser(u);
        fillForm(u);
      }
    };
    fetchUser();
  }, []);

  const fillForm = (u: User) => {
    setFormName(u.name ?? "");
    setFormBio(u.bio ?? "");
    setFormWhatsapp(u.whatsapp ?? "");
    setFormInstagram(u.instagram ?? "");
    setFormAvatarUrl(u.avatarUrl ?? "");
    setFormBusinessName(u.business?.name ?? "");
    setFormCity(u.business?.city ?? "");
    if (u.settings) {
      // Convertir HHmm o Hour simple a HHmm consistente
      const toHHmm = (v: number) => (v <= 24 ? v * 100 : v);
      setFormStartHour(toHHmm(u.settings.startHour));
      setFormEndHour(toHHmm(u.settings.endHour));
      setFormWorkDays(u.settings.workDays);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (editMode === "profile") {
        payload.name = formName;
        payload.bio = formBio;
        payload.avatarUrl = formAvatarUrl;
      } else if (editMode === "hours") {
        if (formStartHour >= formEndHour) {
          alert("La hora de inicio debe ser anterior a la de cierre");
          setSaving(false);
          return;
        }
        payload.settings = {
          workDays: formWorkDays,
          startHour: formStartHour,
          endHour: formEndHour,
        };
      } else if (editMode === "contact") {
        payload.whatsapp = formWhatsapp;
        payload.instagram = formInstagram;
      } else if (editMode === "business") {
        payload.businessName = formBusinessName;
        payload.city = formCity;
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const updated = await res.json();
      if (res.ok) {
        const newUser = {
          ...updated,
          settings: updated.settings
            ? { ...updated.settings, workDays: updated.settings.workDays }
            : null,
        } as User;
        setLocalUser(newUser);
        setUser(newUser);
      }
      setEditMode("none");
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const toggleWorkDay = (day: number) => {
    setFormWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const [fullUrl, setFullUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") {
      setFullUrl(window.location.origin);
    }
  }, []);

  const bookingLink = `${fullUrl}/p/${user?.slug ?? ""}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(bookingLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const settings = user?.settings as ProfessionalSettings | null;

  // Bloquear scroll del body cuando cualquier modal está abierto
  useEffect(() => {
    if (editMode !== "none") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [editMode]);

  // ── Shell ──────────────────────────────────────────────────────────────────
  // Los modales se renderizan FUERA de <main> para evitar que el transform
  // de animate-page los saque del viewport (CSS: transform crea containing block).
  return (
    <>
    <main className="max-w-screen-md mx-auto px-6 pt-24 space-y-8 pb-32 animate-page">
      {/* Profile Header */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-sm relative bg-surface-container-high">
            {user?.avatarUrl ? (
              <Image className="object-cover" alt="Foto de perfil" src={user.avatarUrl} fill sizes="128px" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-rose-100">
                <span className="font-ui font-semibold text-[32px] text-sienna-500">
                  {user?.name?.slice(0, 1) ?? "?"}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => { setEditMode("profile"); fillForm(user!); }}
            className="absolute bottom-1 right-1 bg-primary text-on-primary p-2 rounded-full shadow-md border-2 border-surface-raised active:scale-95 transition-transform"
          >
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
        <div>
          <h1 className="font-cormorant font-normal text-[28px] text-on-surface">
            {user?.name ?? "Tu nombre"}
          </h1>
          <p className="font-ui text-[15px] font-medium text-on-surface-variant capitalize">
            {user?.serviceType ?? "Profesional de belleza"}
          </p>
          {user?.bio && (
            <p className="text-on-surface-variant text-sm mt-2 max-w-xs">{user.bio}</p>
          )}
        </div>
      </section>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Negocio */}
        {user?.appRole === "owner" && (
          <section className="bg-surface border border-outline-variant/30 rounded-xl p-6 space-y-4 md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BuildingStorefrontIcon className="w-5 h-5 text-primary" />
                <h3 className="font-ui font-medium text-[15px] text-on-surface">Mi Negocio</h3>
              </div>
              <button
                onClick={() => { setEditMode("business"); fillForm(user!); }}
                className="p-2 text-on-surface-variant hover:text-primary transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-ui font-semibold text-[18px] text-on-surface">{user.business?.name ?? "Sin nombre"}</p>
                <p className="font-ui text-[13px] text-on-surface-muted">{user.business?.city ?? "Ciudad no configurada"}</p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 bg-primary/10 text-primary rounded-full font-ui text-[11px] font-semibold uppercase">
                Plan {user.business?.plan?.name ?? "FREE"}
              </span>
            </div>
          </section>
        )}

        {/* Horarios */}
        <section className="bg-surface border border-outline-variant/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-5 h-5 text-on-surface-variant" />
            <h3 className="font-ui font-medium text-[15px] text-on-surface">Mi Horario</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
              <span className="text-sm font-medium text-on-surface-variant">
                Días laborables
              </span>
              <span className="font-ui font-medium text-[14px] text-on-surface">
                {settings?.workDays.map((d) => DAY_NAMES[d]).join(", ") ?? "Lun–Vie"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-on-surface-variant">Horario</span>
              <span className="font-mono-num font-medium text-[14px] text-on-surface">
                {settings
                  ? (() => {
                      const format = (v: any) => {
                        const val = Number(v);
                        if (isNaN(val)) return "00:00";
                        const h = Math.floor(val > 24 ? val / 100 : val);
                        const m = val > 24 ? val % 100 : 0;
                        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                      };
                      return `${format(settings.startHour)} – ${format(settings.endHour)}`;
                    })()
                  : "09:00 – 18:00"}
              </span>
            </div>
          </div>
          <button
            onClick={() => { fillForm(user!); setEditMode("hours"); }}
            className="w-full py-2.5 text-sm font-medium text-on-surface-variant border border-outline-variant/30 rounded-full hover:border-primary hover:text-primary transition-colors"
          >
            Editar Horarios
          </button>
        </section>

        {/* Contacto */}
        <section className="bg-surface border border-outline-variant/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-on-surface-variant" />
            <h3 className="font-ui font-medium text-[15px] text-on-surface">Canales de Contacto</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-surface-sunken rounded-lg">
              <span className="font-ui text-[13px] font-medium text-[#25D366]">WA</span>
              <div className="flex-1">
                <p className="font-ui text-[11px] text-on-surface-muted font-medium">WhatsApp</p>
                <p className="font-mono-num text-[13px] font-medium text-on-surface truncate">
                  {user?.whatsapp ?? "No configurado"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-surface-sunken rounded-lg">
              <span className="font-ui text-[13px] font-medium text-[#E1306C]">IG</span>
              <div className="flex-1">
                <p className="font-ui text-[11px] text-on-surface-muted font-medium">Instagram</p>
                <p className="font-ui text-[13px] font-medium text-on-surface truncate">
                  {user?.instagram ? `@${user.instagram.replace("@", "")}` : "No configurado"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditMode("contact")}
            className="w-full py-2.5 text-sm font-medium text-on-surface-variant border border-outline-variant/30 rounded-full hover:border-primary hover:text-primary transition-colors"
          >
            Editar Contacto
          </button>
        </section>
      </div>

      {/* ── Enlace de Reserva ── */}
      <section className="relative overflow-hidden bg-primary/5 rounded-2xl p-6 border border-primary/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-primary">Enlace de Reserva</h3>
            <p className="text-sm text-on-surface-variant">
              Comparte este link con tus clientes para recibir citas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-lg border border-outline-variant/30 text-xs font-mono text-on-surface-variant truncate max-w-[220px]">
              {bookingLink || `.../p/${user?.slug ?? "tu-nombre"}`}
            </div>
            <button
              onClick={handleCopy}
              className="bg-primary hover:bg-primary-hover text-on-primary px-5 py-2 rounded-full font-ui font-medium text-[13px] shadow-primary-sm transition-all active:scale-95 flex items-center gap-2"
            >
              {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardDocumentIcon className="w-4 h-4" />}
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      </section>

      {/* Gestión de Cuenta */}
      <section className="bg-surface border border-outline-variant/30 rounded-xl overflow-hidden mb-8">
        <div className="px-5 py-4 border-b border-outline-variant/10">
          <h3 className="font-ui font-medium text-[14px] text-on-surface">Gestión de Cuenta</h3>
        </div>
        <div className="divide-y divide-outline-variant/10">
          <div
            onClick={() => router.push("/settings/plans")}
            className="flex items-center justify-between px-5 py-4 hover:bg-surface-sunken transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <StarIcon className="w-4 h-4 text-warning" />
              </div>
              <div>
                <p className="font-ui font-medium text-[14px] text-on-surface">Mi Plan</p>
                <p className="font-ui text-[12px] text-primary font-medium capitalize">
                  Plan {user?.business?.plan?.name ?? "FREE"}
                </p>
              </div>
            </div>
            <ArrowRightIcon className="w-4 h-4 text-on-surface-subtle" />
          </div>
          <div
            onClick={logout}
            className="flex items-center justify-between px-5 py-4 hover:bg-error/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-error/10 flex items-center justify-center">
                <ArrowRightStartOnRectangleIcon className="w-4 h-4 text-error" />
              </div>
              <p className="font-ui font-medium text-[14px] text-error">Cerrar Sesión</p>
            </div>
          </div>
        </div>
      </section>
    </main>

    {/* ── Modal: Editar Perfil ── */}
    {editMode === "profile" && (
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditMode("none")} />
        <div className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">
          <div className="px-6 pt-6 overflow-y-auto flex-1 min-h-0">
            <h2 className="font-cormorant text-[22px] text-on-surface mb-6">Editar Perfil</h2>
            <div className="space-y-4">
              <div className="flex justify-center">
                <ImageUploader
                  bucket="staff-avatars"
                  storagePath={`avatar-${user?.id ?? "unknown"}`}
                  currentUrl={formAvatarUrl || null}
                  shape="circle"
                  onUploaded={(url) => setFormAvatarUrl(url)}
                />
              </div>
              <div>
                <label className="font-ui text-[12px] font-medium text-on-surface-muted uppercase tracking-wide">Nombre</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 w-full px-4 py-3 bg-surface-sunken rounded-xl font-ui text-[14px] text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="font-ui text-[12px] font-medium text-on-surface-muted uppercase tracking-wide">Biografía</label>
                <textarea
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  rows={3}
                  className="mt-1 w-full px-4 py-3 bg-surface-sunken rounded-xl font-ui text-[14px] text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 shrink-0 border-t border-outline-variant/10">
            <button onClick={() => setEditMode("none")} className="flex-1 py-3 font-ui font-medium text-[14px] text-on-surface-variant border border-outline-variant/30 rounded-full">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 font-ui font-medium text-[14px] bg-primary text-on-primary rounded-full disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal: Mi Negocio ── */}
    {editMode === "business" && (
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditMode("none")} />
        <div className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">
          <div className="px-6 pt-6 overflow-y-auto flex-1 min-h-0">
            <h2 className="font-cormorant text-[22px] text-on-surface mb-6">Mi Negocio</h2>
            <div className="space-y-4">
              <div>
                <label className="font-ui text-[12px] font-medium text-on-surface-muted uppercase tracking-wide">Nombre del Negocio</label>
                <input
                  value={formBusinessName}
                  onChange={(e) => setFormBusinessName(e.target.value)}
                  className="mt-1 w-full px-4 py-3 bg-surface-sunken rounded-xl font-ui text-[14px] text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="font-ui text-[12px] font-medium text-on-surface-muted uppercase tracking-wide">Ciudad</label>
                <input
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  className="mt-1 w-full px-4 py-3 bg-surface-sunken rounded-xl font-ui text-[14px] text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 shrink-0 border-t border-outline-variant/10">
            <button onClick={() => setEditMode("none")} className="flex-1 py-3 font-ui font-medium text-[14px] text-on-surface-variant border border-outline-variant/30 rounded-full">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 font-ui font-medium text-[14px] bg-primary text-on-primary rounded-full disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal: Horarios ── */}
    {editMode === "hours" && (
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditMode("none")} />
        <div className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">
          <div className="px-6 pt-6 overflow-y-auto flex-1 min-h-0">
            <h2 className="font-cormorant text-[22px] text-on-surface mb-6">Editar Horarios</h2>
            <div className="space-y-5">
              <div>
                <label className="font-ui text-[12px] font-medium text-on-surface-muted uppercase tracking-wide mb-3 block">Días de Trabajo</label>
                <div className="flex gap-2 flex-wrap">
                  {DAY_NAMES.map((name, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleWorkDay(idx)}
                      className={`px-3 py-2 rounded-full font-ui text-[13px] font-medium transition-colors ${
                        formWorkDays.includes(idx)
                          ? "bg-primary text-on-primary"
                          : "bg-surface-sunken text-on-surface-variant border border-outline-variant/30"
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-ui text-[12px] font-medium text-on-surface-muted uppercase tracking-wide">Apertura</label>
                  <select
                    value={formStartHour}
                    onChange={(e) => setFormStartHour(Number(e.target.value))}
                    className="mt-1 w-full px-4 py-3 bg-surface-sunken rounded-xl font-ui text-[14px] text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                  >
                    {Array.from({ length: 24 }, (_, i) => i * 100).map((h) => (
                      <option key={h} value={h}>{`${String(Math.floor(h / 100)).padStart(2, "0")}:00`}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-ui text-[12px] font-medium text-on-surface-muted uppercase tracking-wide">Cierre</label>
                  <select
                    value={formEndHour}
                    onChange={(e) => setFormEndHour(Number(e.target.value))}
                    className="mt-1 w-full px-4 py-3 bg-surface-sunken rounded-xl font-ui text-[14px] text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                  >
                    {Array.from({ length: 24 }, (_, i) => i * 100).map((h) => (
                      <option key={h} value={h}>{`${String(Math.floor(h / 100)).padStart(2, "0")}:00`}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 shrink-0 border-t border-outline-variant/10">
            <button onClick={() => setEditMode("none")} className="flex-1 py-3 font-ui font-medium text-[14px] text-on-surface-variant border border-outline-variant/30 rounded-full">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 font-ui font-medium text-[14px] bg-primary text-on-primary rounded-full disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    )}

    {/* ── Modal: Contacto ── */}
    {editMode === "contact" && (
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditMode("none")} />
        <div className="relative w-full sm:max-w-md bg-surface rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90dvh]">
          <div className="px-6 pt-6 overflow-y-auto flex-1 min-h-0">
            <h2 className="font-cormorant text-[22px] text-on-surface mb-6">Canales de Contacto</h2>
            <div className="space-y-4">
              <div>
                <label className="font-ui text-[12px] font-medium text-[#25D366] uppercase tracking-wide">WhatsApp</label>
                <input
                  value={formWhatsapp}
                  onChange={(e) => setFormWhatsapp(e.target.value)}
                  placeholder="04121234567"
                  className="mt-1 w-full px-4 py-3 bg-surface-sunken rounded-xl font-mono-num text-[14px] text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="font-ui text-[12px] font-medium text-[#E1306C] uppercase tracking-wide">Instagram</label>
                <input
                  value={formInstagram}
                  onChange={(e) => setFormInstagram(e.target.value)}
                  placeholder="@tunombre"
                  className="mt-1 w-full px-4 py-3 bg-surface-sunken rounded-xl font-ui text-[14px] text-on-surface border border-outline-variant/30 focus:outline-none focus:border-primary"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3 px-6 py-4 shrink-0 border-t border-outline-variant/10">
            <button onClick={() => setEditMode("none")} className="flex-1 py-3 font-ui font-medium text-[14px] text-on-surface-variant border border-outline-variant/30 rounded-full">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 py-3 font-ui font-medium text-[14px] bg-primary text-on-primary rounded-full disabled:opacity-50">
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </div>
      </div>
    )}
  </>
  );
}
