"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

export default function TopAppBar() {
  const pathname = usePathname();

  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/booking")
  ) {
    return null;
  }

  return (
    <header className="fixed top-0 w-full z-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-lg shadow-sm shadow-purple-500/5 flex items-center justify-between px-6 py-4 h-16">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-high ring-2 ring-primary/10 relative">
          <Image
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD153hwfqyV91l0XKWFVoaP7-XISLUZf648pNC5QRUff2lagkvmiwzUSxPD6q0VkgxXzL9CVu4MQXFCFXedhHTeGPva9FWn8DHIZcMqZI-VqT6LbxbYXqHoWMy0M1JB9J4jQeGXmhMOJKe7r456-JyCrawMbE9_Rh4QVovEYLzezt20-XhJVF3oIqlGV-fMdW5yn6ChaB96yItWAX3jHV1kcar4bvFam22QiMOxX9WwIWHjLoWWXOSPF2xODz1IVC6wszjVgR6b8_VK"
            alt="Profile Picture"
            fill
            className="object-cover"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tighter text-zinc-900 dark:text-zinc-50 font-headline leading-tight">
            Aura Gestora
          </h1>
        </div>
      </div>
      <button className="material-symbols-outlined text-purple-700 dark:text-purple-400 p-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors rounded-full">
        notifications
      </button>
    </header>
  );
}
