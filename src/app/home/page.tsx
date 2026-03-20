"use client";

export default function Home() {
  return (
    <main className="pt-20 px-6 max-w-2xl mx-auto pb-32">
      {/* Hero Section */}
      <section className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-on-surface">
          Hola, Elena
        </h1>
        <p className="text-on-surface-variant font-medium mt-1">
          Hoy es lunes, 24 de Mayo
        </p>
      </section>

      {/* Stats Overview (Editorial Impact) */}
      <div className="grid grid-cols-2 gap-4 mb-10">
        <div className="bg-surface-container-low p-5 rounded-3xl">
          <span className="text-on-surface-variant text-sm font-semibold uppercase tracking-wider block mb-2">
            Ingresos Hoy
          </span>
          <span className="text-3xl font-extrabold text-primary">€420</span>
        </div>
        <div className="bg-surface-container-low p-5 rounded-3xl">
          <span className="text-on-surface-variant text-sm font-semibold uppercase tracking-wider block mb-2">
            Citas
          </span>
          <span className="text-3xl font-extrabold text-primary">8/12</span>
        </div>
      </div>

      {/* Vertical Timeline Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-on-surface">Próximas Citas</h2>
        <button className="text-primary font-semibold text-sm">
          Ver todas
        </button>
      </div>

      {/* Timeline Container */}
      <div className="space-y-6 relative">
        {/* Timeline Line Decoration (Subtle Dot Spacing per Design System) */}
        <div className="absolute left-4 top-0 bottom-0 w-px border-l-2 border-dotted border-outline-variant opacity-30 pointer-events-none"></div>

        {/* Appointment 1: Completed */}
        <div className="relative flex gap-6">
          <div className="flex-none w-8 flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-tertiary ring-4 ring-white z-10"></div>
          </div>
          <div className="flex-1 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border-l-4 border-tertiary">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                  9:00 AM
                </span>
                <h3 className="text-lg font-bold text-on-surface">
                  Maria Perez
                </h3>
                <p className="text-on-surface-variant text-sm">Manicura</p>
              </div>
              <span className="bg-tertiary/10 text-tertiary text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                Completado
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 rounded-full border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface transition-colors">
                Ver Cliente
              </button>
            </div>
          </div>
        </div>

        {/* Appointment 2: In Progress */}
        <div className="relative flex gap-6">
          <div className="flex-none w-8 flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-primary ring-4 ring-white z-10"></div>
          </div>
          <div className="flex-1 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border-l-4 border-primary">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                  10:30 AM
                </span>
                <h3 className="text-lg font-bold text-on-surface">
                  Lucia Gomez
                </h3>
                <p className="text-on-surface-variant text-sm">Pedicura</p>
              </div>
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                En curso
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2.5 rounded-full bg-primary text-white text-xs font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all">
                Marcar Terminado
              </button>
              <button className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface-variant hover:bg-surface transition-colors flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">
                  more_horiz
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Appointment 3: Confirmed */}
        <div className="relative flex gap-6">
          <div className="flex-none w-8 flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-outline-variant ring-4 ring-white z-10"></div>
          </div>
          <div className="flex-1 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border-l-4 border-outline-variant">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                  12:00 PM
                </span>
                <h3 className="text-lg font-bold text-on-surface">Ana Lopez</h3>
                <p className="text-on-surface-variant text-sm">Cejas</p>
              </div>
              <span className="bg-surface-container text-on-surface-variant text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                Confirmado
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4">
              <button className="py-2 rounded-lg bg-surface-container-low text-[11px] font-bold text-on-surface-variant flex flex-col items-center gap-1 hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-lg">
                  check_circle
                </span>
                Listo
              </button>
              <button className="py-2 rounded-lg bg-surface-container-low text-[11px] font-bold text-on-surface-variant flex flex-col items-center gap-1 hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-lg">
                  cancel
                </span>
                No-show
              </button>
              <button className="py-2 rounded-lg bg-surface-container-low text-[11px] font-bold text-on-surface-variant flex flex-col items-center gap-1 hover:bg-surface-container-high transition-colors">
                <span className="material-symbols-outlined text-lg">
                  person
                </span>
                Cliente
              </button>
            </div>
          </div>
        </div>

        {/* Appointment 4: No-show */}
        <div className="relative flex gap-6">
          <div className="flex-none w-8 flex flex-col items-center">
            <div className="w-4 h-4 rounded-full bg-error ring-4 ring-white z-10"></div>
          </div>
          <div className="flex-1 bg-surface-container-lowest p-5 rounded-2xl shadow-sm border-l-4 border-error opacity-75">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest block mb-1">
                  2:00 PM
                </span>
                <h3 className="text-lg font-bold text-on-surface line-through decoration-error/40">
                  Rosa M.
                </h3>
                <p className="text-on-surface-variant text-sm">Pelo</p>
              </div>
              <span className="bg-error-container text-on-error-container text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                No-show
              </span>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 py-2 rounded-full border border-outline-variant text-xs font-semibold text-on-surface-variant hover:bg-surface transition-colors">
                Reagendar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-28 right-6 w-14 h-14 bg-gradient-to-br from-primary to-primary-container text-white rounded-full shadow-lg flex items-center justify-center active:scale-90 transition-transform z-40">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </main>
  );
}
