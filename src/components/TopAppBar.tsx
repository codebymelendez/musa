"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Avatar } from "@/components/ui/Avatar";
import NotificationBell from "./NotificationBell";

const HIDDEN_PATHS = [
  "/",
  "/login",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
];

export default function TopAppBar() {
  const pathname = usePathname();
  const { user } = useAppStore();

  const isHidden =
    HIDDEN_PATHS.includes(pathname) ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/staff/join") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/cita/");

  if (isHidden) return null;

  const displayName = user?.business?.name || user?.name || "Musa";
  const avatarSrc = user?.avatarUrl ?? null;

  return (
    <header className="fixed top-0 w-full z-40 glass-nav border-b border-border-subtle flex items-center justify-between px-5 h-[60px]">
      <div className="flex items-center gap-3">
        <Avatar
          src={avatarSrc}
          name={displayName}
          size="sm"
          className="ring-1 ring-border"
        />
        <div>
          <h1 className="font-ui font-medium text-[15px] text-on-surface leading-tight truncate max-w-[180px]">
            {displayName}
          </h1>
        </div>
      </div>
      <NotificationBell />
    </header>
  );
}
