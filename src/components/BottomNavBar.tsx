"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  HomeIcon,
  CalendarDaysIcon,
  UsersIcon,
  SparklesIcon,
  EllipsisHorizontalCircleIcon,
  ScissorsIcon,
  ChartBarIcon,
  TagIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import {
  HomeIcon as HomeSolid,
  CalendarDaysIcon as CalendarSolid,
  UsersIcon as UsersSolid,
  SparklesIcon as SparklesSolid,
} from "@heroicons/react/24/solid";

const MORE_ITEMS = [
  { href: "/services",          Icon: ScissorsIcon,   label: "Servicios"    },
  { href: "/stats",             Icon: ChartBarIcon,   label: "Estadísticas" },
  { href: "/promotions",        Icon: TagIcon,        label: "Promociones"  },
  { href: "/team",              Icon: UserGroupIcon,  label: "Equipo"       },
  { href: "/settings/business", Icon: Cog6ToothIcon,  label: "Ajustes"      },
  { href: "/profile",           Icon: UserCircleIcon, label: "Perfil"       },
];

const HIDDEN_PATHS = [
  "/",
  "/login",
  "/onboarding",
  "/forgot-password",
  "/reset-password",
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isHidden =
    HIDDEN_PATHS.includes(pathname) ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/staff/join") ||
    pathname.startsWith("/explore") ||
    (pathname === "/client" || pathname.startsWith("/client/")) ||
    pathname.startsWith("/cita/");

  if (isHidden) return null;

  const moreIsActive = MORE_ITEMS.some((i) => pathname.startsWith(i.href));

  const primaryItems = [
    {
      href: "/home",
      OutlineIcon: HomeIcon,
      SolidIcon: HomeSolid,
      label: "Inicio",
      active: pathname === "/home",
    },
    {
      href: "/calendar",
      OutlineIcon: CalendarDaysIcon,
      SolidIcon: CalendarSolid,
      label: "Agenda",
      active: pathname === "/calendar",
    },
    {
      href: "/clients",
      OutlineIcon: UsersIcon,
      SolidIcon: UsersSolid,
      label: "Clientas",
      active: pathname === "/clients",
    },
    {
      href: "/loyalty",
      OutlineIcon: SparklesIcon,
      SolidIcon: SparklesSolid,
      label: "Puntos",
      active: pathname.startsWith("/loyalty"),
    },
  ];

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-[100] bg-espresso-900/40 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* "Más" bottom sheet */}
      {moreOpen && (
        <div className="fixed bottom-[76px] left-3 right-3 z-[110] bg-surface-raised rounded-2xl shadow-xl border border-border-subtle p-4 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between mb-3 px-1">
            <p className="text-overline text-on-surface-subtle">Más opciones</p>
            <button
              onClick={() => setMoreOpen(false)}
              className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-subtle hover:bg-surface-sunken transition-colors"
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {MORE_ITEMS.map(({ href, Icon, label }) => {
              const isActive = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl transition-all duration-150 active:scale-95",
                    isActive
                      ? "bg-primary-surface text-primary"
                      : "bg-surface-sunken text-on-surface-muted hover:bg-stone-100 hover:text-on-surface"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-ui text-[10px] font-semibold tracking-wide">
                    {label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main nav bar */}
      <nav className="fixed bottom-0 left-0 w-full z-[110] glass-nav border-t border-border-subtle rounded-t-2xl">
        <div
          className="flex justify-around items-center px-2 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom,1.5rem))]"
          style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}
        >
          {primaryItems.map(({ href, OutlineIcon, SolidIcon, label, active }) => {
            const Icon = active ? SolidIcon : OutlineIcon;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 px-4 py-1.5 rounded-xl min-w-[60px] transition-all duration-150 active:scale-90",
                  active
                    ? "text-primary"
                    : "text-on-surface-subtle hover:text-on-surface-muted"
                )}
              >
                <Icon className="w-6 h-6" />
                <span
                  className={cn(
                    "font-ui text-[10px] tracking-wide",
                    active ? "font-bold" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-4 py-1.5 rounded-xl min-w-[60px] transition-all duration-150 active:scale-90",
              moreOpen || moreIsActive
                ? "text-primary"
                : "text-on-surface-subtle hover:text-on-surface-muted"
            )}
          >
            {moreOpen ? (
              <XMarkIcon className="w-6 h-6" />
            ) : (
              <EllipsisHorizontalCircleIcon className="w-6 h-6" />
            )}
            <span
              className={cn(
                "font-ui text-[10px] tracking-wide",
                moreOpen || moreIsActive ? "font-bold" : "font-medium"
              )}
            >
              Más
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
