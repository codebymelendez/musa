"use client";

export default function Stats() {
  return (
    <main className="max-w-screen-xl mx-auto px-6 pt-24 pb-32 space-y-8">
      {/* 1. Resumen Mensual (Editorial Moment) */}
      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-on-surface-variant text-sm font-medium tracking-wide mb-1 uppercase">
              Este Mes
            </p>
            <h2 className="font-headline font-extrabold text-4xl text-on-surface tracking-tight">
              $1,240
            </h2>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-tertiary/10 text-tertiary text-xs font-bold">
              <span
                className="material-symbols-outlined text-[14px] mr-1"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                trending_up
              </span>
              +12%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest p-6 rounded-[24px] shadow-sm border border-transparent">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-2xl">
                  event_available
                </span>
              </div>
              <div>
                <p className="text-on-surface-variant text-sm">
                  Citas realizadas
                </p>
                <p className="text-on-surface font-manrope font-bold text-2xl">
                  42
                </p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low p-6 rounded-[24px]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                <span className="material-symbols-outlined text-2xl">
                  avg_time
                </span>
              </div>
              <div>
                <p className="text-on-surface-variant text-sm">
                  Tiempo productivo
                </p>
                <p className="text-on-surface font-manrope font-bold text-2xl">
                  128h
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Top 3 Servicios (Bento Style) */}
      <section className="space-y-4">
        <h3 className="font-manrope font-bold text-xl text-on-surface px-1">
          Top Servicios
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Rank 1 */}
          <div className="bg-surface-container-lowest p-5 rounded-[24px] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/5 rounded-full"></div>
            <div className="z-10">
              <span className="text-primary font-manrope font-black text-4xl opacity-20">
                01
              </span>
              <h4 className="font-bold text-lg mt-1">Manicura</h4>
            </div>
            <div className="z-10 flex items-end justify-between">
              <p className="text-on-surface-variant text-sm">24 servicios</p>
              <div className="h-1.5 w-24 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[85%]"></div>
              </div>
            </div>
          </div>

          {/* Rank 2 */}
          <div className="bg-surface-container-lowest p-5 rounded-[24px] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="z-10">
              <span className="text-secondary font-manrope font-black text-4xl opacity-20">
                02
              </span>
              <h4 className="font-bold text-lg mt-1">Secado</h4>
            </div>
            <div className="z-10 flex items-end justify-between">
              <p className="text-on-surface-variant text-sm">12 servicios</p>
              <div className="h-1.5 w-24 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-secondary w-[45%]"></div>
              </div>
            </div>
          </div>

          {/* Rank 3 */}
          <div className="bg-surface-container-lowest p-5 rounded-[24px] shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[160px]">
            <div className="z-10">
              <span className="text-tertiary font-manrope font-black text-4xl opacity-20">
                03
              </span>
              <h4 className="font-bold text-lg mt-1">Pedicura</h4>
            </div>
            <div className="z-10 flex items-end justify-between">
              <p className="text-on-surface-variant text-sm">6 servicios</p>
              <div className="h-1.5 w-24 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-tertiary w-[25%]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Tarjetas de métricas individuales */}
      <section className="space-y-4">
        <h3 className="font-manrope font-bold text-xl text-on-surface px-1">
          Métricas Detalladas
        </h3>
        <div className="space-y-3">
          {/* Ingresos Totales */}
          <div className="bg-surface-container-low p-6 rounded-[24px] flex items-center justify-between group hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <span
                  className="material-symbols-outlined text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  payments
                </span>
              </div>
              <div>
                <p className="text-on-surface font-semibold">Ingresos Totales</p>
                <p className="text-on-surface-variant text-sm">
                  Acumulado anual
                </p>
              </div>
            </div>
            <p className="font-manrope font-bold text-lg">$14,820</p>
          </div>

          {/* Retención de Clientes */}
          <div className="bg-surface-container-low p-6 rounded-[24px] flex items-center justify-between group hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <span
                  className="material-symbols-outlined text-tertiary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  group
                </span>
              </div>
              <div>
                <p className="text-on-surface font-semibold">
                  Retención de Clientes
                </p>
                <p className="text-on-surface-variant text-sm">
                  Clientes que regresan
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-manrope font-bold text-lg">78%</p>
            </div>
          </div>

          {/* Promedio por Servicio */}
          <div className="bg-surface-container-low p-6 rounded-[24px] flex items-center justify-between group hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  analytics
                </span>
              </div>
              <div>
                <p className="text-on-surface font-semibold">
                  Promedio por Servicio
                </p>
                <p className="text-on-surface-variant text-sm">Ticket medio</p>
              </div>
            </div>
            <p className="font-manrope font-bold text-lg">$29.50</p>
          </div>
        </div>
      </section>

      {/* CTA Action */}
      <div className="pt-4 pb-8">
        <button className="w-full h-[56px] bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold text-lg shadow-lg shadow-primary/20 active:scale-95 transition-transform duration-200">
          Descargar Reporte PDF
        </button>
      </div>
    </main>
  );
}
