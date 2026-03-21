"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchUnreadCount();
    // Polling ligero (cada 1 min) para actualizaciones en vivo si no hay websockets
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const notifications = await res.json();
        const unread = notifications.filter((n: any) => !n.read).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <button 
      onClick={() => router.push("/notifications")}
      className="p-2 hover:bg-surface-container-high dark:hover:bg-zinc-800 transition-colors rounded-full relative"
    >
      <span className="material-symbols-outlined text-zinc-900 dark:text-zinc-50">
        notifications
      </span>
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-950"></span>
      )}
    </button>
  );
}
