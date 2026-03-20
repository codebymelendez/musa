"use client";

export default function Services() {
  return (
    <main className="pt-24 px-6 max-w-5xl mx-auto pb-32">
      {/* Header & FAB Alternative for Desktop */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <span className="font-headline text-sm font-semibold tracking-wider text-primary uppercase mb-1 block">
            Management
          </span>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Services
          </h2>
          <p className="text-on-surface-variant mt-1">
            Configure your treatment menu and pricing.
          </p>
        </div>
        <button className="hidden md:flex items-center gap-2 bg-gradient-to-br from-primary to-primary-container text-white px-6 py-3 rounded-full font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
          <span className="material-symbols-outlined">add</span>
          Add New Service
        </button>
      </div>

      {/* Filter Chips (Editorial Style) */}
      <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
        <span className="px-5 py-2 rounded-full bg-primary text-on-primary text-sm font-medium whitespace-nowrap">
          All Services
        </span>
        <span className="px-5 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-sm font-medium whitespace-nowrap hover:bg-surface-container-high transition-colors cursor-pointer">
          Hair
        </span>
        <span className="px-5 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-sm font-medium whitespace-nowrap hover:bg-surface-container-high transition-colors cursor-pointer">
          Nails
        </span>
        <span className="px-5 py-2 rounded-full bg-surface-container-low text-on-surface-variant text-sm font-medium whitespace-nowrap hover:bg-surface-container-high transition-colors cursor-pointer">
          Brows & Lashes
        </span>
      </div>

      {/* Bento Grid Layout for Services */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Service Card: Manicura Básica */}
        <div className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-secondary overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button className="text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5">
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          </div>
          <div className="mb-4">
            <span className="text-xs font-bold text-secondary uppercase tracking-widest mb-1 block">
              Nails
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
              Manicura Básica
            </h3>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">
                  schedule
                </span>
                <span className="text-sm font-medium">45 min</span>
              </div>
            </div>
            <div className="bg-surface-container-low px-4 py-2 rounded-lg">
              <span className="text-lg font-extrabold text-on-surface">$15</span>
            </div>
          </div>
        </div>

        {/* Service Card: Secado de Cabello */}
        <div className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-primary overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button className="text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5">
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          </div>
          <div className="mb-4">
            <span className="text-xs font-bold text-primary uppercase tracking-widest mb-1 block">
              Hair
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
              Secado de Cabello
            </h3>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">
                  schedule
                </span>
                <span className="text-sm font-medium">60 min</span>
              </div>
            </div>
            <div className="bg-surface-container-low px-4 py-2 rounded-lg">
              <span className="text-lg font-extrabold text-on-surface">$25</span>
            </div>
          </div>
        </div>

        {/* Service Card: Cejas con Hilo */}
        <div className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-tertiary overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button className="text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5">
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          </div>
          <div className="mb-4">
            <span className="text-xs font-bold text-tertiary uppercase tracking-widest mb-1 block">
              Eyes
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
              Cejas con Hilo
            </h3>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">
                  schedule
                </span>
                <span className="text-sm font-medium">30 min</span>
              </div>
            </div>
            <div className="bg-surface-container-low px-4 py-2 rounded-lg">
              <span className="text-lg font-extrabold text-on-surface">$12</span>
            </div>
          </div>
        </div>

        {/* Service Card: Balayage Premium */}
        <div className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-primary overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button className="text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5">
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          </div>
          <div className="mb-4">
            <span className="text-xs font-bold text-primary uppercase tracking-widest mb-1 block">
              Hair
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
              Balayage Premium
            </h3>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">
                  schedule
                </span>
                <span className="text-sm font-medium">180 min</span>
              </div>
            </div>
            <div className="bg-surface-container-low px-4 py-2 rounded-lg">
              <span className="text-lg font-extrabold text-on-surface">
                $120
              </span>
            </div>
          </div>
        </div>

        {/* Service Card: Pedicura Spa */}
        <div className="group relative bg-surface-container-lowest rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-300 border-l-4 border-secondary overflow-hidden">
          <div className="absolute top-0 right-0 p-4">
            <button className="text-outline hover:text-primary transition-colors p-2 rounded-full hover:bg-primary/5">
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
          </div>
          <div className="mb-4">
            <span className="text-xs font-bold text-secondary uppercase tracking-widest mb-1 block">
              Nails
            </span>
            <h3 className="font-headline text-xl font-bold text-on-surface group-hover:text-primary transition-colors">
              Pedicura Spa
            </h3>
          </div>
          <div className="flex items-center justify-between mt-auto">
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">
                  schedule
                </span>
                <span className="text-sm font-medium">60 min</span>
              </div>
            </div>
            <div className="bg-surface-container-low px-4 py-2 rounded-lg">
              <span className="text-lg font-extrabold text-on-surface">$30</span>
            </div>
          </div>
        </div>

        {/* Empty Placeholder / Add Action */}
        <div className="group border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center hover:bg-surface-container-low transition-colors cursor-pointer">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
            <span className="material-symbols-outlined">add</span>
          </div>
          <span className="font-headline font-semibold text-on-surface">
            New Category
          </span>
          <p className="text-xs text-on-surface-variant mt-1">
            Organize your menu
          </p>
        </div>
      </div>

      {/* Floating Action Button (Mobile) */}
      <button className="md:hidden fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-xl shadow-primary/30 flex items-center justify-center active:scale-90 transition-transform z-50">
        <span className="material-symbols-outlined">add</span>
      </button>
    </main>
  );
}
