"use client";

export default function Calendar() {
  return (
    <main className="pt-24 pb-32 px-4 max-w-5xl mx-auto">
      {/* Calendar Toggle & Header Stats */}
      <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-on-surface-variant font-medium text-sm tracking-wider uppercase">
            Overview
          </span>
          <h2 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Week 42
          </h2>
        </div>
        <div className="flex bg-surface-container-low p-1.5 rounded-2xl w-fit">
          <button className="px-6 py-2 rounded-xl text-sm font-bold bg-surface-container-lowest text-primary shadow-sm">
            Weekly
          </button>
          <button className="px-6 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors">
            Monthly
          </button>
        </div>
      </section>

      {/* Weekly Calendar Grid */}
      <div className="bg-surface-container-lowest rounded-[2.5rem] shadow-2xl shadow-zinc-900/5 overflow-hidden">
        {/* Day Headers */}
        <div className="grid grid-cols-8 border-b border-surface-container py-6 bg-surface-container-low/30">
          <div className="flex items-center justify-center text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Time
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              MON
            </span>
            <span className="text-lg font-headline font-bold text-on-surface">
              16
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              TUE
            </span>
            <span className="text-lg font-headline font-bold text-on-surface">
              17
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-bold text-primary">WED</span>
            <span className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white text-lg font-headline font-bold">
              18
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              THU
            </span>
            <span className="text-lg font-headline font-bold text-on-surface">
              19
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              FRI
            </span>
            <span className="text-lg font-headline font-bold text-on-surface">
              20
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-50">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              SAT
            </span>
            <span className="text-lg font-headline font-bold text-on-surface">
              21
            </span>
          </div>
          <div className="flex flex-col items-center gap-1 opacity-50">
            <span className="text-[11px] font-semibold text-on-surface-variant">
              SUN
            </span>
            <span className="text-lg font-headline font-bold text-on-surface">
              22
            </span>
          </div>
        </div>

        {/* Time Grid */}
        <div className="grid grid-cols-8 relative">
          {/* Time Labels Column */}
          <div className="flex flex-col">
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              09 AM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              10 AM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              11 AM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              12 PM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              01 PM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              02 PM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              03 PM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              04 PM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              05 PM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              06 PM
            </div>
            <div className="h-20 flex items-start justify-center pt-2 text-[11px] font-medium text-on-surface-variant border-r border-surface-container">
              07 PM
            </div>
          </div>

          {/* Grid Cells (Representing Wednesday focus) */}
          <div className="col-span-7 relative">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 grid grid-rows-11 pointer-events-none">
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="border-b border-surface-container-low h-20"></div>
              <div className="h-20"></div>
            </div>

            {/* Appointments */}
            {/* Monday 9AM - Booked */}
            <div className="absolute top-0 left-[0%] w-[14.28%] h-20 p-1">
              <div className="h-full w-full bg-primary-container/20 border-l-4 border-primary rounded-lg p-2 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-primary truncate leading-tight">
                  M. Rivera
                </span>
                <span className="text-[9px] text-primary/80 truncate">
                  Balayage
                </span>
              </div>
            </div>

            {/* Tuesday 11AM - Break */}
            <div className="absolute top-[160px] left-[14.28%] w-[14.28%] h-20 p-1">
              <div className="h-full w-full bg-surface-container-high rounded-lg p-2 flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant text-sm">
                  coffee
                </span>
              </div>
            </div>

            {/* Wednesday 10AM - Booked (Active Day) */}
            <div className="absolute top-[80px] left-[28.56%] w-[14.28%] h-[120px] p-1 z-10">
              <div className="h-full w-full bg-gradient-to-br from-primary to-primary-container rounded-xl p-3 shadow-lg shadow-purple-500/20 flex flex-col">
                <span className="text-[10px] font-bold text-white uppercase tracking-tighter">
                  10:00 - 11:30
                </span>
                <span className="text-[11px] font-bold text-white mt-1 leading-tight">
                  Juliana Smith
                </span>
                <span className="text-[9px] text-white/80">Full Styling</span>
              </div>
            </div>

            {/* Thursday 2PM - Booked */}
            <div className="absolute top-[400px] left-[42.84%] w-[14.28%] h-20 p-1">
              <div className="h-full w-full bg-primary-container/20 border-l-4 border-primary rounded-lg p-2">
                <span className="text-[10px] font-bold text-primary truncate">
                  P. Chen
                </span>
              </div>
            </div>

            {/* Friday 4PM - Booked */}
            <div className="absolute top-[560px] left-[57.12%] w-[14.28%] h-[160px] p-1">
              <div className="h-full w-full bg-primary-container/20 border-l-4 border-primary rounded-lg p-2">
                <span className="text-[10px] font-bold text-primary truncate">
                  A. Volkov
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-8 flex items-center gap-6 px-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span className="text-xs font-medium text-on-surface-variant">
            Booked
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-surface-container-high"></div>
          <span className="text-xs font-medium text-on-surface-variant">
            Break
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-white border border-outline-variant"></div>
          <span className="text-xs font-medium text-on-surface-variant">
            Free
          </span>
        </div>
      </div>

      {/* FAB */}
      <button className="fixed bottom-28 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-primary-container text-white shadow-xl shadow-purple-500/30 flex items-center justify-center transition-transform active:scale-90 z-40">
        <span className="material-symbols-outlined text-3xl">add</span>
      </button>
    </main>
  );
}
