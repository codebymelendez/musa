"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MagnifyingGlassIcon, ArrowRightIcon } from "@heroicons/react/24/outline";

const CATEGORIES = [
  { key: "nails",  label: "Uñas"       },
  { key: "hair",   label: "Cabello"    },
  { key: "brows",  label: "Cejas"      },
  { key: "lashes", label: "Pestañas"   },
  { key: "makeup", label: "Maquillaje" },
  { key: "other",  label: "Spa & Más"  },
];

export default function HomeSearch() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    router.push(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  };

  return (
    <>
      <form onSubmit={handleSearch} className="mt-8">
        <div
          className="flex items-center gap-3 h-[56px] px-5 bg-surface-raised border border-border rounded-2xl focus-within:border-border-focus focus-within:shadow-[0_0_0_3px_rgba(181,89,62,0.09),0_2px_8px_rgba(26,14,11,0.05)] transition-all duration-200"
          style={{ boxShadow: "0 2px 8px rgba(26,14,11,0.06), 0 1px 2px rgba(26,14,11,0.04)" }}
        >
          <MagnifyingGlassIcon className="w-[17px] h-[17px] text-on-surface-subtle flex-shrink-0" />
          <input
            className="flex-1 bg-transparent outline-none font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle"
            placeholder="Uñas, cabello, tu ciudad…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoComplete="off"
          />
          <button
            type="submit"
            className="flex-shrink-0 w-[38px] h-[38px] bg-primary rounded-full flex items-center justify-center text-on-primary hover:bg-primary-hover transition-colors shadow-primary-sm"
            aria-label="Buscar"
          >
            <ArrowRightIcon className="w-4 h-4" />
          </button>
        </div>
      </form>

      <nav className="mt-4 flex items-center gap-2.5 flex-wrap" aria-label="Categorías">
        {CATEGORIES.map(({ key, label }) => (
          <Link key={key} href={`/explore?category=${key}`} className="musa-chip">
            {label}
          </Link>
        ))}
      </nav>
    </>
  );
}
