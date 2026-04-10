"use client";

import { useState, useEffect, useCallback } from "react";
import { Client } from "@/types";
import ClientModalForm from "@/components/clients/ClientModalForm";

function getInitials(name: string) {
  return name
    .trim()
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatBirthday(dateStr: string | null) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-VE", { day: "numeric", month: "short" });
}

const TAG_COLORS: Record<string, string> = {
  VIP:            "bg-yellow-100 text-yellow-800",
  Frecuente:      "bg-green-100 text-green-800",
  Referida:       "bg-blue-100 text-blue-800",
  Estudiante:     "bg-purple-100 text-purple-800",
  "Nuevo cliente":"bg-teal-100 text-teal-800",
};

export default function ClientsPage() {
  const [clients,       setClients]       = useState<Client[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showInactive,  setShowInactive]  = useState(false);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editTarget,    setEditTarget]    = useState<Client | null>(null);
  const [archiving,     setArchiving]     = useState<string | null>(null);

  // Debounce search
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

  const handleEdit = (client: Client) => {
    setEditTarget(client);
    setModalOpen(true);
  };

  const handleNew = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleArchive = async (client: Client) => {
    const action = client.isActive ? "archivar" : "reactivar";
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} a "${client.name}"?`)) return;

    setArchiving(client.id);
    try {
      const res = client.isActive
        ? await fetch(`/api/clients/${client.id}`, { method: "DELETE" })
        : await fetch(`/api/clients/${client.id}`, {
            method:  "PATCH",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ isActive: true }),
          });

      if (res.ok) fetchClients();
    } finally {
      setArchiving(null);
    }
  };

  const handleModalSaved = () => {
    setModalOpen(false);
    setEditTarget(null);
    fetchClients();
  };

  const active   = clients.filter((c) => c.isActive);
  const inactive = clients.filter((c) => !c.isActive);

  return (
    <main className="pt-24 px-4 max-w-5xl mx-auto pb-32">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 px-2">
        <div>
          <span className="font-headline text-sm font-semibold tracking-wider text-primary uppercase mb-1 block">
            Gestión
          </span>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Clientas
          </h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            {active.length} activa{active.length !== 1 ? "s" : ""}
            {inactive.length > 0 && ` · ${inactive.length} archivada${inactive.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={handleNew}
          className="hidden md:flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          <span className="material-symbols-outlined">person_add</span>
          Añadir clienta
        </button>
      </div>

      {/* ─── Barra de búsqueda y filtros ─── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 px-2">
        <div className="relative flex-1">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-on-surface-variant/50 text-xl">search</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email..."
            className="w-full h-12 pl-12 pr-4 bg-surface-container-high rounded-2xl border-none focus:ring-2 focus:ring-primary text-on-surface placeholder:text-on-surface-variant/40 text-sm"
          />
        </div>
        <button
          onClick={() => setShowInactive((v) => !v)}
          className={`flex items-center gap-2 px-5 h-12 rounded-2xl text-sm font-semibold transition-colors whitespace-nowrap ${
            showInactive
              ? "bg-secondary text-on-secondary shadow-sm"
              : "bg-surface-container-high text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-base">
            {showInactive ? "visibility" : "visibility_off"}
          </span>
          {showInactive ? "Ver todas" : "Ver archivadas"}
        </button>
      </div>

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex justify-center py-16">
          <span className="material-symbols-outlined text-primary animate-spin text-4xl">progress_activity</span>
        </div>
      )}

      {/* ─── Empty state ─── */}
      {!loading && clients.length === 0 && (
        <div className="text-center py-20 text-on-surface-variant">
          <span className="material-symbols-outlined text-6xl mb-4 block opacity-40">group</span>
          <p className="font-headline font-semibold text-lg mb-1">
            {search ? "Sin resultados" : "Aún no hay clientas"}
          </p>
          <p className="text-sm mb-6 max-w-xs mx-auto">
            {search
              ? `No encontramos "${search}". Prueba con otro nombre o número.`
              : "Añade tu primera clienta manualmente o espera a que reserven."}
          </p>
          {!search && (
            <button
              onClick={handleNew}
              className="inline-flex items-center gap-2 bg-primary text-on-primary px-6 py-3 rounded-full font-semibold shadow-md shadow-primary/20 hover:scale-105 transition-transform"
            >
              <span className="material-symbols-outlined">person_add</span>
              Añadir primera clienta
            </button>
          )}
        </div>
      )}

      {/* ─── Lista ─── */}
      {!loading && clients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-2">
          {clients.map((client) => {
            const isArchiving = archiving === client.id;
            const totalCitas  = client.appointments?.length ?? 0;
            const lastCita    = client.appointments?.[0];

            return (
              <div
                key={client.id}
                className={`group relative bg-surface-container-lowest rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-outline-variant/30 ${
                  !client.isActive ? "opacity-60" : ""
                }`}
              >
                {/* Badge inactiva */}
                {!client.isActive && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full">
                    Archivada
                  </span>
                )}

                <div className="flex items-start gap-4">
                  {/* Avatar con iniciales */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/70 to-secondary/70 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {getInitials(client.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Nombre + cumple */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-headline font-bold text-on-surface text-base truncate">
                        {client.name}
                      </h3>
                      {client.birthday && (
                        <span className="flex items-center gap-0.5 text-xs text-on-surface-variant/70">
                          <span className="material-symbols-outlined text-[14px]">cake</span>
                          {formatBirthday(client.birthday)}
                        </span>
                      )}
                    </div>

                    {/* Teléfono y email */}
                    <div className="flex items-center gap-1 text-xs text-on-surface-variant mt-0.5">
                      <span className="material-symbols-outlined text-[13px]">phone</span>
                      <span>{client.phone}</span>
                      {client.email && (
                        <>
                          <span className="mx-1 opacity-30">·</span>
                          <span className="truncate">{client.email}</span>
                        </>
                      )}
                    </div>

                    {/* Tags */}
                    {client.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {client.tags.map((tag) => (
                          <span
                            key={tag}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TAG_COLORS[tag] ?? "bg-surface-container text-on-surface-variant"}`}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Stat citas */}
                    <div className="flex items-center gap-3 mt-3 text-xs text-on-surface-variant">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">event</span>
                        {totalCitas} cita{totalCitas !== 1 ? "s" : ""}
                      </span>
                      {lastCita && (
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">schedule</span>
                          Últ: {new Date(lastCita.startTime).toLocaleDateString("es-VE", { day: "numeric", month: "short" })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notas / preferencias preview */}
                {(client.preferences || client.notes) && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/20">
                    {client.preferences && (
                      <p className="text-xs text-on-surface-variant/80 line-clamp-1">
                        <span className="font-semibold">Pref:</span> {client.preferences}
                      </p>
                    )}
                    {client.notes && (
                      <p className="text-xs text-on-surface-variant/60 line-clamp-1 mt-0.5">
                        <span className="font-semibold">Nota:</span> {client.notes}
                      </p>
                    )}
                  </div>
                )}

                {/* Acciones */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-outline-variant/20">
                  <button
                    onClick={() => handleEdit(client)}
                    className="flex-1 flex items-center justify-center gap-1.5 h-9 bg-surface-container text-on-surface-variant text-xs font-semibold rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                    Editar
                  </button>

                  <button
                    onClick={() => handleArchive(client)}
                    disabled={isArchiving}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-9 text-xs font-semibold rounded-xl transition-colors ${
                      client.isActive
                        ? "bg-surface-container text-on-surface-variant hover:bg-error/10 hover:text-error"
                        : "bg-surface-container text-on-surface-variant hover:bg-green-50 hover:text-green-700"
                    } disabled:opacity-40`}
                  >
                    {isArchiving ? (
                      <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-base">
                          {client.isActive ? "person_off" : "person_check"}
                        </span>
                        {client.isActive ? "Archivar" : "Reactivar"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── FAB mobile ─── */}
      <button
        onClick={handleNew}
        className="md:hidden fixed bottom-28 right-5 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform z-50"
        aria-label="Añadir clienta"
      >
        <span className="material-symbols-outlined">person_add</span>
      </button>

      {/* ─── Modal ─── */}
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
