"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { User, ProfessionalSettings } from "@/types";
import { formatCurrency } from "@/lib/utils";
import ImageUploader from "@/components/ui/ImageUploader";

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

      if (editMode === "hours") {
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

  return (
    <main className="max-w-screen-md mx-auto px-6 pt-24 space-y-8 pb-32">
      {/* Profile Header */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-sm relative bg-surface-container-high">
            {user?.avatarUrl ? (
              <Image className="object-cover" alt="Foto de perfil" src={user.avatarUrl} fill />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-on-surface-variant">person</span>
              </div>
            )}
          </div>
          <button
            onClick={() => { setEditMode("profile"); fillForm(user!); }}
            className="absolute bottom-1 right-1 bg-primary text-on-primary p-2 rounded-full shadow-lg border-2 border-surface-container-lowest active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
            {user?.name ?? "Tu nombre"}
          </h2>
          <p className="text-on-surface-variant font-medium capitalize">
            {user?.serviceType ?? "Profesional de belleza"}
          </p>
          {user?.bio && (
            <p className="text-on-surface-variant text-sm mt-2 max-w-xs">{user.bio}</p>
          )}
        </div>
      </section>

      {/* Edit Profile Modal */}
      {editMode === "profile" && (
        <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-end sm:items-center justify-center">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-xl font-bold">Editar Perfil</h3>
              <button onClick={() => setEditMode("none")} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
             <div className="space-y-4">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Foto de Perfil</label>
              <ImageUploader
                currentUrl={formAvatarUrl || null}
                bucket="staff-avatars"
                storagePath={`staff/${user?.id ?? 'new'}/avatar`}
                onUploaded={(url) => setFormAvatarUrl(url)}
                shape="circle"
                fallbackInitials={formName ? formName.slice(0,2).toUpperCase() : undefined}
                hint="Tu foto profesional · JPG, PNG o WebP"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider ml-1">Nombre</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Tu nombre" className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface" />
            </div>
            <textarea value={formBio} onChange={(e) => setFormBio(e.target.value)} placeholder="Descripción de tu negocio..." rows={3} className="w-full px-4 py-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm resize-none" />
            <button onClick={handleSave} disabled={saving} className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {editMode === "business" && (
        <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-end sm:items-center justify-center">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-xl font-bold">Editar Negocio</h3>
              <button onClick={() => setEditMode("none")} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Nombre del Negocio</label>
              <input type="text" value={formBusinessName} onChange={(e) => setFormBusinessName(e.target.value)} placeholder="Ej. Aurora Atelier" className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ciudad</label>
              <input type="text" value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="Ej. Caracas" className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface" />
            </div>
            <button onClick={handleSave} disabled={saving || !formBusinessName} className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full disabled:opacity-50">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Negocio */}
        {user?.role === "OWNER" && (
          <section className="bg-surface-container-lowest rounded-xl p-6 space-y-4 shadow-sm border-l-4 border-secondary md:col-span-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">storefront</span>
                <h3 className="font-bold text-on-surface">Mi Negocio</h3>
              </div>
              <button
                onClick={() => { setEditMode("business"); fillForm(user!); }}
                className="p-2 rounded-full bg-secondary/10 text-secondary hover:bg-secondary/20 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">edit</span>
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-xl font-extrabold text-on-surface">{user.business?.name ?? "Sin nombre"}</p>
                <p className="text-sm text-on-surface-variant">{user.business?.city ?? "Ciudad no configurada"}</p>
              </div>
              <span className="self-start sm:self-auto px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold uppercase">
                Plan {user.business?.plan?.name ?? "FREE"}
              </span>
            </div>
          </section>
        )}

        {/* Horarios */}
        <section className="bg-surface-container-lowest rounded-xl p-6 space-y-4 shadow-sm border-l-4 border-primary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">schedule</span>
            <h3 className="font-bold text-on-surface">Mi Horario</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
              <span className="text-sm font-medium text-on-surface-variant">
                Días laborables
              </span>
              <span className="text-sm font-bold text-on-surface">
                {settings?.workDays.map((d) => DAY_NAMES[d]).join(", ") ?? "Lun–Vie"}
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-on-surface-variant">Horario</span>
              <span className="text-sm font-bold text-on-surface">
                {settings
                  ? (() => {
                      const format = (v: number) => {
                        const h = Math.floor(v > 24 ? v / 100 : v);
                        const m = v > 24 ? v % 100 : 0;
                        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                      };
                      return `${format(settings.startHour)} – ${format(settings.endHour)}`;
                    })()
                  : "09:00 – 18:00"}
              </span>
            </div>
          </div>
          <button
            onClick={() => { setEditMode("hours"); }}
            className="w-full py-2.5 text-sm font-semibold text-primary bg-primary/5 rounded-full hover:bg-primary/10 transition-colors"
          >
            Editar Horarios
          </button>
        </section>

        {/* Contacto */}
        <section className="bg-surface-container-lowest rounded-xl p-6 space-y-4 shadow-sm border-l-4 border-tertiary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">contact_support</span>
            <h3 className="font-bold text-on-surface">Canales de Contacto</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-surface-container-low rounded-lg">
              <span className="material-symbols-outlined text-[#25D366]">chat</span>
              <div className="flex-1">
                <p className="text-xs text-on-surface-variant font-medium">WhatsApp</p>
                <p className="text-sm font-bold text-on-surface truncate">
                  {user?.whatsapp ?? "No configurado"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-surface-container-low rounded-lg">
              <span className="material-symbols-outlined text-[#E1306C]">photo_camera</span>
              <div className="flex-1">
                <p className="text-xs text-on-surface-variant font-medium">Instagram</p>
                <p className="text-sm font-bold text-on-surface truncate">
                  {user?.instagram ? `@${user.instagram.replace("@", "")}` : "No configurado"}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={() => setEditMode("contact")}
            className="w-full py-2.5 text-sm font-semibold text-tertiary bg-tertiary/5 rounded-full hover:bg-tertiary/10 transition-colors"
          >
            Editar Contacto
          </button>
        </section>
      </div>

      {/* Edit Hours Modal */}
      {editMode === "hours" && (
        <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-end sm:items-center justify-center">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-xl font-bold">Editar Horarios</h3>
              <button onClick={() => setEditMode("none")} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Días disponibles</label>
              <div className="flex gap-2 flex-wrap">
                {DAY_NAMES.map((name, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleWorkDay(idx)}
                    className={`w-10 h-10 rounded-full text-sm font-bold transition-colors ${formWorkDays.includes(idx) ? "bg-primary text-on-primary" : "bg-surface-container-low text-on-surface-variant"}`}
                  >
                    {name[0]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Hora inicio</label>
                <div className="flex gap-1">
                  <select 
                    value={Math.floor(formStartHour / 100)} 
                    onChange={(e) => setFormStartHour(parseInt(e.target.value) * 100 + (formStartHour % 100))}
                    className="flex-1 h-12 px-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                  <select 
                    value={formStartHour % 100} 
                    onChange={(e) => setFormStartHour(Math.floor(formStartHour / 100) * 100 + parseInt(e.target.value))}
                    className="flex-1 h-12 px-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Hora cierre</label>
                <div className="flex gap-1">
                  <select 
                    value={Math.floor(formEndHour / 100)} 
                    onChange={(e) => setFormEndHour(parseInt(e.target.value) * 100 + (formEndHour % 100))}
                    className="flex-1 h-12 px-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm"
                  >
                    {Array.from({ length: 25 }, (_, i) => (
                      <option key={i} value={i}>{i.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                  <select 
                    value={formEndHour % 100} 
                    onChange={(e) => setFormEndHour(Math.floor(formEndHour / 100) * 100 + parseInt(e.target.value))}
                    className="flex-1 h-12 px-3 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface text-sm"
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editMode === "contact" && (
        <div className="fixed inset-0 z-[100] bg-surface/95 backdrop-blur-md flex items-end sm:items-center justify-center">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-headline text-xl font-bold">Editar Contacto</h3>
              <button onClick={() => setEditMode("none")} className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">WhatsApp</label>
              <input type="tel" value={formWhatsapp} onChange={(e) => setFormWhatsapp(e.target.value)} placeholder="+58 412 000 0000" className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">Instagram</label>
              <input type="text" value={formInstagram} onChange={(e) => setFormInstagram(e.target.value)} placeholder="@tu_usuario" className="w-full h-12 px-4 bg-surface-container-high rounded-xl border-none focus:ring-2 focus:ring-primary text-on-surface" />
            </div>
            <button onClick={handleSave} disabled={saving} className="w-full h-14 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-full">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {/* Enlace de Reserva */}
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
              className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2 rounded-full font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">
                {copied ? "check" : "content_copy"}
              </span>
              {copied ? "¡Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      </section>

      {/* Gestión de Cuenta */}
      <section className="bg-surface-container-low rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h3 className="font-bold text-on-surface">Gestión de Cuenta</h3>
        </div>
        <div className="divide-y divide-outline-variant/10">
          <div
            onClick={() => router.push("/settings/plans")}
            className="flex items-center justify-between px-6 py-4 hover:bg-black/5 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant">stars</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Mi Plan</p>
                <p className="text-xs text-primary font-bold capitalize">
                  Plan {user?.business?.plan?.name ?? "FREE"}
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
          </div>
          <div
            onClick={logout}
            className="flex items-center justify-between px-6 py-4 hover:bg-error/5 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-error">logout</span>
              <p className="text-sm font-bold text-error">Cerrar Sesión</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
