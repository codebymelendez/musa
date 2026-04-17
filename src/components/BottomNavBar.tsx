"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const MORE_ITEMS = [
  { href: "/services",   icon: "content_cut",  label: "Servicios" },
  { href: "/stats",      icon: "query_stats",  label: "Estadísticas" },
  { href: "/promotions", icon: "local_offer",  label: "Promociones" },
  { href: "/team",       icon: "group",        label: "Equipo" },
  { href: "/settings/business", icon: "settings", label: "Ajustes" },
  { href: "/profile",    icon: "person",       label: "Perfil" },
];

export default function BottomNavBar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  // Hide nav bar on public / client-facing pages
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/booking") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/staff/join") ||
    pathname.startsWith("/explore") ||
    pathname.startsWith("/client") ||
    pathname.startsWith("/cita/") ||
    pathname === "/forgot-password" ||
    pathname === "/reset-password" ||
    pathname === "/onboarding"
  ) {
    return null;
  }

  const moreIsActive = MORE_ITEMS.some((i) => pathname.startsWith(i.href));

  const primaryItems = [
    { href: "/home",     icon: "home",          label: "Inicio",   active: pathname === "/home" },
    { href: "/calendar", icon: "calendar_today", label: "Agenda",   active: pathname === "/calendar" },
    { href: "/clients",  icon: "manage_accounts", label: "Clientas", active: pathname === "/clients" },
    { href: "/loyalty",  icon: "stars",          label: "Puntos",   active: pathname.startsWith("/loyalty") },
  ];

  return (
    <>
      {/* Backdrop for "Más" sheet */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {/* "Más" bottom sheet */}
      {moreOpen && (
        <div className="fixed bottom-[72px] left-3 right-3 z-[110] bg-white rounded-[2rem] shadow-2xl shadow-black/20 p-5 animate-in slide-in-from-bottom-4 duration-200">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-4 px-1">
            Más opciones
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MORE_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  className={clsx(
                    "flex flex-col items-center gap-2 py-3 px-2 rounded-2xl transition-colors active:scale-95",
                    isActive
                      ? "bg-purple-100 text-purple-900"
                      : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[26px]"
                    style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Main nav bar */}
      <nav className="fixed bottom-0 left-0 w-full z-[110] bg-white/90 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] rounded-t-[2rem]">
        <div className="flex justify-around items-center px-2 pb-6 pt-2">
          {primaryItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex flex-col items-center justify-center px-4 py-2 transition-transform duration-200 active:scale-90 min-w-[60px]",
                item.active
                  ? "bg-purple-100 text-purple-900 rounded-full"
                  : "text-zinc-400 hover:text-purple-600"
              )}
            >
              <span
                className="material-symbols-outlined mb-0.5 text-[24px]"
                style={{ fontVariationSettings: item.active ? "'FILL' 1" : "'FILL' 0" }}
              >
                {item.icon}
              </span>
              <span className="font-headline text-[10px] font-bold tracking-wide uppercase">
                {item.label}
              </span>
            </Link>
          ))}

          {/* Más button */}
          <button
            onClick={() => setMoreOpen((v) => !v)}
            className={clsx(
              "flex flex-col items-center justify-center px-4 py-2 transition-transform duration-200 active:scale-90 min-w-[60px]",
              moreOpen || moreIsActive
                ? "bg-purple-100 text-purple-900 rounded-full"
                : "text-zinc-400 hover:text-purple-600"
            )}
          >
            <span
              className="material-symbols-outlined mb-0.5 text-[24px]"
              style={{ fontVariationSettings: moreOpen ? "'FILL' 1" : "'FILL' 0" }}
            >
              {moreOpen ? "close" : "grid_view"}
            </span>
            <span className="font-headline text-[10px] font-bold tracking-wide uppercase">
              Más
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
