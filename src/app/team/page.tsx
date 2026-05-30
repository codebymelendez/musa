"use client";

import { useState, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";

interface Invitation {
  id: string;
  token: string;
  code: string;
  createdAt: string;
  expiresAt: string | null;
}

export default function TeamPage() {
  const { user } = useAppStore();
  const router = useRouter();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (user && user.appRole !== "owner") {
      router.push("/home");
      return;
    }
    fetchInvitations();
  }, [user]);

  const fetchInvitations = async () => {
    try {
      const res = await fetch("/api/team/invite");
      if (res.ok) {
        const data = await res.ok ? await res.json() : [];
        setInvitations(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createInvitation = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/team/invite", { method: "POST" });
      if (res.ok) {
        const newInvite = await res.json();
        setInvitations([newInvite, ...invitations]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="p-8 text-center text-on-surface-variant">Cargando equipo...</div>;

  return (
    <div className="min-h-screen bg-background p-6 pb-32">
      <div className="max-w-md mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">Tu Equipo</h1>
          <p className="text-on-surface-variant">Gestiona a tus colaboradores y envía invitaciones.</p>
        </header>

        <section className="bg-surface-container-low rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-on-surface">Invitaciones Pendientes</h2>
            <button
              onClick={createInvitation}
              disabled={creating}
              className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-bold flex items-center gap-2"
            >
              {creating ? "Generando..." : (
                <>
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  Invitar
                </>
              )}
            </button>
          </div>

          {invitations.length === 0 ? (
            <p className="text-sm text-on-surface-variant py-4 text-center">No hay invitaciones activas.</p>
          ) : (
            <div className="space-y-3">
              {invitations.map((invite) => {
                const inviteUrl = `${window.location.origin}/staff/join?token=${invite.token}`;
                return (
                  <div key={invite.id} className="p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-bold text-on-surface-variant uppercase">Código</p>
                        <p className="font-mono text-lg font-bold text-primary">{invite.code}</p>
                      </div>
                      <span className="text-[10px] bg-secondary-container text-on-secondary-container px-2 py-0.5 rounded-full font-bold">
                        Vence: {invite.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="space-y-2">
                       <p className="text-xs text-on-surface-variant">Enlace de invitación:</p>
                       <div className="flex gap-2">
                         <input 
                           readOnly 
                           value={inviteUrl} 
                           className="flex-1 bg-surface-container min-w-0 px-3 py-2 rounded-lg text-xs font-mono text-on-surface-variant border-none"
                         />
                         <button 
                           onClick={() => copyToClipboard(inviteUrl, invite.id)}
                           className="p-2 bg-surface-container-high rounded-lg text-primary hover:bg-surface-container-highest transition-colors"
                         >
                           <span className="material-symbols-outlined text-lg">
                             {copied === invite.id ? "check" : "content_copy"}
                           </span>
                         </button>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-surface-container-low rounded-3xl p-6 space-y-4">
           <h2 className="font-bold text-lg text-on-surface">Personal Activo</h2>
           <p className="text-sm text-on-surface-variant">Próximamente: Lista de empleados y gestión de permisos.</p>
        </section>
      </div>
    </div>
  );
}
