"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  url?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        setNotifications(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, read: true }),
      });
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-12 text-center text-primary animate-pulse">Cargando notificaciones...</div>;

  return (
    <div className="min-h-screen bg-background p-6 pb-32 pt-20">
      <div className="max-w-md mx-auto space-y-8">
        <header className="space-y-1">
          <h1 className="font-headline text-3xl font-extrabold text-on-surface">Notificaciones</h1>
          <p className="text-on-surface-variant">Mantente al tanto de la actividad de tu negocio.</p>
        </header>

        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-on-surface-variant opacity-50 space-y-4">
             <span className="material-symbols-outlined text-6xl">notifications_off</span>
             <p className="font-bold">Todo al día por aquí</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => !n.read && markAsRead(n.id)}
                className={`p-5 rounded-3xl border transition-all ${
                  n.read 
                    ? "bg-surface-container-low border-outline-variant opacity-70" 
                    : "bg-surface-container border-primary/20 shadow-md scale-[1.02]"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className={`font-bold ${n.read ? "text-on-surface" : "text-primary"}`}>{n.title}</h3>
                  <span className="text-[10px] text-on-surface-variant whitespace-nowrap">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-on-surface-variant leading-relaxed">{n.body}</p>
                {!n.read && (
                  <div className="mt-3 flex justify-end">
                    <span className="w-2 h-2 bg-primary rounded-full"></span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
