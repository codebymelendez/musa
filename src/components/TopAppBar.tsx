"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAppStore } from "@/store/useAppStore";
import NotificationBell from "./NotificationBell";

export default function TopAppBar() {
  const pathname = usePathname();
  const { user } = useAppStore();

  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/onboarding" ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/staff/join") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/cita/") ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password"
  ) {
    return null;
  }

  const displayName = user?.business?.name || user?.name || "Musa";
  const avatarUrl = user?.avatarUrl || "https://lh3.googleusercontent.com/aida-public/AB6AXuD153hwfqyV91l0XKWFVoaP7-XISLUZf648pNC5QRUff2lagkvmiwzUSxPD6q0VkgxXzL9CVu4MQXFCFXedhHTeGPva9FWn8DHIZcMqZI-VqT6LbxbYXqHoWMy0M1JB9J4jQeGXmhMOJKe7r456-JyCrawMbE9_Rh4QVovEYLzezt20-XhJVF3oIqlGV-fMdW5yn6ChaB96yItWAX3jHV1kcar4bvFam22QiMOxX9WwIWHjLoWWXOSPF2xODz1IVC6wszjVgR6b8_VK";

  return (
    <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg shadow-sm shadow-purple-500/5 flex items-center justify-between px-6 py-4 h-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high ring-2 ring-primary/10 relative">
          <Image
            src={avatarUrl}
            alt="Profile Picture"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-50 font-headline leading-tight truncate max-w-[180px]">
            {displayName}
          </h1>
        </div>
      </div>
      <NotificationBell />
    </header>
  );
}
