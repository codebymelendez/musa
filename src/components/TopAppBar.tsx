"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/store/useAppStore";
import { Avatar } from "@/components/ui/Avatar";
import NotificationBell from "./NotificationBell";
import MusaLogo from "@/components/brand/MusaLogo";

const ALLOWED_PATHS = [
  "/home",
  "/calendar",
  "/services",
  "/stats",
  "/profile",
  "/team",
  "/settings",
  "/notifications",
  "/loyalty",
  "/clients",
];

export default function TopAppBar() {
  const pathname = usePathname();
  const { user } = useAppStore();

  const isAllowed =
    pathname &&
    ALLOWED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!isAllowed) return null;

  const displayName = user?.business?.name || user?.name || null;
  const avatarSrc = user?.avatarUrl ?? null;

  return (
    <header className="fixed top-0 w-full z-50 glass-nav border-b border-border-subtle flex items-center justify-between px-5 h-[60px]">
      <div className="flex items-center gap-3">
        <MusaLogo variant="monogram" size="sm" />
        <span className="w-px h-5 bg-border flex-shrink-0" aria-hidden="true" />
        {displayName ? (
          <h1 className="font-ui font-medium text-[14px] text-on-surface leading-tight truncate max-w-[160px]">
            {displayName}
          </h1>
        ) : (
          <div className="h-[14px] w-28 rounded bg-surface-sunken animate-pulse" />
        )}
      </div>
      <div className="flex items-center gap-2.5">
        <NotificationBell />
        <Avatar
          src={avatarSrc}
          name={displayName ?? ""}
          size="sm"
          className="ring-1 ring-border"
        />
      </div>
    </header>
  );
}
