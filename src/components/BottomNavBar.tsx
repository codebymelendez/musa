"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export default function BottomNavBar() {
  const pathname = usePathname();

  // Hide nav bar on onboarding, login, and public booking view.
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

  const navItems = [
    {
      href: "/home",
      icon: "home",
      label: "Home",
      fill: pathname === "/home" ? "1" : "0",
    },
    {
      href: "/calendar",
      icon: "calendar_today",
      label: "Calendar",
      fill: pathname === "/calendar" ? "1" : "0",
    },
    {
      href: "/services",
      icon: "content_cut",
      label: "Services",
      fill: pathname === "/services" ? "1" : "0",
    },
    {
      href: "/stats",
      icon: "query_stats",
      label: "Stats",
      fill: pathname === "/stats" ? "1" : "0",
    },
    {
      href: "/profile",
      icon: "person",
      label: "Profile",
      fill: pathname === "/profile" ? "1" : "0",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.04)] rounded-t-[2rem] z-50">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex flex-col items-center justify-center px-4 py-2 tap-highlight-transparent transition-transform duration-300 active:scale-90",
              isActive
                ? "bg-purple-100 dark:bg-purple-900/40 text-purple-900 dark:text-purple-100 rounded-full"
                : "text-zinc-400 dark:text-zinc-500 hover:text-purple-600 dark:hover:text-purple-300"
            )}
          >
            <span
              className="material-symbols-outlined mb-1 text-[24px]"
              style={{ fontVariationSettings: `'FILL' ${item.fill}` }}
            >
              {item.icon}
            </span>
            <span className="font-headline text-[10px] font-bold tracking-wide uppercase">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
