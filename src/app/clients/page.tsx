"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  UsersIcon,
  PhoneIcon,
  CalendarDaysIcon,
  ClockIcon,
  PencilIcon,
  UserMinusIcon,
  CheckCircleIcon,
  UserPlusIcon,
  CakeIcon,
} from "@heroicons/react/24/outline";
import { Client } from "@/types";
import ClientModalForm from "@/components/clients/ClientModalForm";

function getInitials(name: string) {
  return name.trim().split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

function formatBirthday(dateStr: string | null) {
  if (!dateStr) return null;
  return new Date(dateStr + "T12:00:00").toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

const TAG_COLORS: Record<string, string> = {
  VIP:             "bg-yellow-100 text-yellow-800",
  Frecuente:       "bg-green-100 text-green-800",
  Referida:        "bg-sky-100 text-sky-800",
  Estudiante:      "bg-rose-100 text-rose-800",
  "Nuevo cliente": "bg-teal-100 text-teal-800",
};

export default function ClientsPage() {
  const [clients,         setClients]         = useState<Client[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [search,          setSearch]          = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showInactive,    setShowInactive]    = useState(false);
  const [modalOpen,       setModalOpen]       = useState(false);
  const [editTarget,      setEditTarget]      = useState<Client | null>(null);
  const [archiving,       setArchiving]       = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (showInactive)    params.set("showInactive", "true");
      const res  = await fetch(`/api/clients?${params.toString()}`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch {
      setClients([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, showInactive]);

  useEffect(() => { fetchClients(); }, [fetchClients]);

  const handleEdit    = (c: Client) => { setEditTarget(c); setModalOpen(true); };
  const handleNew     = () => { setEditTarget(null); setModalOpen(true); };
  const handleModalSaved = () => { setModalOpen(false); setEditTarget(null); fetchClients(); };

  const handleArchive = async (client: Client) => {
    const action = client.isActive ? "archivar" : "reactivar";
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${client.name}"?`)) return;
    setArchiving(client.id);
    try {
      const res = client.isActive
        ? await fetch(`/api/clients/${client.id}`, { method: "DELETE" })
        : await fetch(`/api/clients/${client.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isActive: true }),
          });
      if (res.ok) fetchClients();
    } finally {
      setArchiving(null);
    }
  };

  const active   = clients.filter((c) => c.isActive);
  const inactive = clients.filter((c) => !c.isActive);

  return (
    <main className="pt-24 px-4 max-w-5xl mx-auto pb-32 animate-page">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 px-1">
        <div>
          <span className="font-ui text-[11px] font-semibold tracking-widest text-primary uppercase mb-1 block">
            Gestión
          </span>
          <h1 className="font-display text-[32px] font-semibold text-on-surface tracking-[-0.02em] italic">
            Clientas
          </h1>
          <p className="font-ui text-[14px] text-on-surface-muted mt-1">
            {active.length} activa{active.length !== 1 ? "s" : ""}
            {inactive.length > 0 && ` · ${inactive.length} archivada${inactive.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="hidden md:flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-ui font-semibold text-[14px] shadow-primary-sm hover:bg-primary-hover transition-colors"
        >
          <UserPlusIcon className="w-4 h-4" />
          Añadir clienta
        </button>
      </div>

      {/* ── Search + filter ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 px-1">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="w-full h-11 pl-10 pr-4 bg-surface-raised border border-border rounded-lg font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle outline-none focus:border-border-focus transition-colors"
          />
        </div>
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`flex items-center gap-2 px-5 h-11 rounded-lg font-ui text-[13px] font-semibold transition-colors whitespace-nowrap border ${
            showInactive
              ? "bg-primary/10 text-primary border-primary/20"
              : "bg-surface-raised text-on-surface-muted border-border hover:border-border-focus"
          }`}
        >
          {showInactive ? <EyeIcon className="w-4 h-4" /> : <EyeSlashIcon className="w-4 h-4" />}
          {showInactive ? "Ver todas" : "Ver archivadas"}
        </button>
      </div>

      {/* ── Loading ─────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {!loading && clients.length === 0 && (
        <div className="text-center py-20 text-on-surface-muted">
          <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="font-ui font-semibold text-[16px] text-on-surface mb-1">
            {search ? "Sin resultados" : "Aún no hay clientas"}
          </p>
          <p className="font-ui text-[13px] max-w-xs mx-auto mb-6">
            {search
              ? `No encontramos "${search}". Prueba con otro nombre o número.`
              : "Añade tu primera clienta manualmente o espera a que reserven."}
          </p>
          {!search && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-full font-ui font-semibold text-[14px] shadow-primary-sm hover:bg-primary-hover transition-colors"
            >
              <UserPlusIcon className="w-4 h-4" />
              Añadir primera clienta
            </button>
          )}
        </div>
      )}

      {/* ── Grid ────────────────────────────────────────────────────── */}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-1">
          {clients.map((client) => {
            const isArchiving = archiving === client.id;
            const totalCitas  = client.appointments?.length ?? 0;
            const lastCita    = client.appointments?.[0];

            return (
              <div
                key={client.id}
                className={`relative bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-200 ${
                  !client.isActive ? "opacity-60" : ""
                }`}
              >
                {!client.isActive && (
                  <span className="absolute top-3 right-3 font-ui text-[10px] font-semibold uppercase tracking-widest bg-surface-sunken text-on-surface-muted px-2 py-0.5 rounded-full">
                    Archivada
                  </span>
                )}

                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center font-ui font-semibold text-[15px] text-sienna-700 shrink-0">
                    {getInitials(client.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-ui font-semibold text-[15px] text-on-surface truncate">
                        {client.name}
                      </h3>
                      {client.birthday && (
                        <span className="flex items-center gap-0.5 font-ui text-[11px] text-on-surface-subtle">
                          <CakeIcon className="w-3 h-3" />
                          {formatBirthday(client.birthday)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 font-ui text-[12px] text-on-surface-muted mt-0.5">
                      <PhoneIcon className="w-3 h-3 shrink-0" />
                      <span>{client.phone}</span>
                      {client.email && (
                        <>
                          <span className="mx-1 opacity-30">·</span>
                          <span className="truncate">{client.email}</span>
                        </>
                      )}
                    </div>

                    {client.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full font-ui text-[10px] font-semibold ${TAG_COLORS[tag] ?? "bg-surface-sunken text-on-surface-muted"}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-3 mt-2.5 font-ui text-[11px] text-on-surface-subtle">
                      <span className="flex items-center gap-1">
                        <CalendarDaysIcon className="w-3 h-3" />
                        {totalCitas} cita{totalCitas !== 1 ? "s" : ""}
                      </span>
                      {lastCita && (
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3 h-3" />
                          Últ: {new Date(lastCita.startTime).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {(client.preferences || client.notes) && (
                  <div className="mt-3 pt-3 border-t border-border-subtle">
                    {client.preferences && (
                      <p className="font-ui text-[12px] text-on-surface-muted line-clamp-1">
                        <span className="font-semibold">Pref:</span> {client.preferences}
                      </p>
                    )}
                    {client.notes && (
                      <p className="font-ui text-[12px] text-on-surface-subtle line-clamp-1 mt-0.5">
                        <span className="font-semibold">Nota:</span> {client.notes}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-subtle">
                  <button
                    onClick={() => handleEdit(client)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-surface-sunken text-on-surface-muted font-ui text-[12px] font-semibold rounded-lg hover:bg-primary/5 hover:text-primary transition-colors"
                  >
                    <PencilIcon className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleArchive(client)}
                    disabled={isArchiving}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 font-ui text-[12px] font-semibold rounded-lg transition-colors disabled:opacity-40 ${
                      client.isActive
                        ? "bg-surface-sunken text-on-surface-muted hover:bg-error-surface hover:text-error"
                        : "bg-surface-sunken text-on-surface-muted hover:bg-success-surface hover:text-success"
                    }`}
                  >
                    {isArchiving ? (
                      <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : client.isActive ? (
                      <><UserMinusIcon className="w-3.5 h-3.5" /> Archivar</>
                    ) : (
                      <><CheckCircleIcon className="w-3.5 h-3.5" /> Reactivar</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── FAB mobile ──────────────────────────────────────────────── */}
      <button
        onClick={handleNew}
        className="md:hidden fixed bottom-28 right-5 w-14 h-14 rounded-full bg-primary text-on-primary shadow-primary-md flex items-center justify-center active:scale-90 transition-transform z-50 hover:bg-primary-hover musa-fab"
        aria-label="Añadir clienta"
      >
        <UserPlusIcon className="w-5 h-5" />
      </button>

      {modalOpen && (
        <ClientModalForm
          client={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSaved={handleModalSaved}
        />
      )}
    </main>
  );
}
