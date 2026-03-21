"use client";

import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    name: "FREE",
    price: "0",
    features: [
      "Hasta 30 citas / mes",
      "1 miembro de personal",
      "Gestión de clientes básica",
      "Calendario online",
    ],
    isCurrent: true,
  },
  {
    name: "PRO",
    price: "10",
    features: [
      "Citas ilimitadas",
      "Hasta 5 miembros de personal",
      "Recordatorios WhatsApp ilimitados",
      "Estadísticas avanzadas",
      "Soporte prioritario",
    ],
    isCurrent: false,
    highlight: true,
  }
];

export default function PlansPage() {
  const { user } = useAppStore();
  const currentPlan = user?.business?.plan?.name || "FREE";

  return (
    <div className="min-h-screen bg-background p-6 pb-32 pt-20">
      <div className="max-w-md mx-auto space-y-8">
        <header className="text-center space-y-2">
          <h1 className="font-headline text-4xl font-extrabold text-on-surface">Mejora tu Plan</h1>
          <p className="text-on-surface-variant">Escala tu negocio con funciones potentes.</p>
        </header>

        <div className="space-y-6">
          {PLANS.map((plan) => {
            const isSelected = plan.name === currentPlan;
            return (
              <div 
                key={plan.name}
                className={`relative p-8 rounded-[2rem] border-2 transition-all ${
                  plan.highlight 
                    ? 'bg-primary text-on-primary border-primary shadow-xl shadow-primary/20 scale-105' 
                    : 'bg-surface-container-low border-outline-variant text-on-surface'
                }`}
              >
                {isSelected && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    plan.highlight ? 'bg-on-primary text-primary' : 'bg-primary text-on-primary'
                  }`}>
                    Tu Plan Actual
                  </span>
                )}

                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-black">{plan.name}</h2>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">${plan.price}</span>
                      <span className="opacity-70 text-sm font-bold">/ mes</span>
                    </div>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm font-medium">
                        <span className="material-symbols-outlined text-lg opacity-80">check_circle</span>
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {!isSelected && (
                    <button 
                      className={`w-full h-14 rounded-2xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                        plan.highlight 
                          ? 'bg-on-primary text-primary' 
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      {plan.name === "PRO" ? "Actualizar a Pro" : "Seleccionar"}
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-on-surface-variant px-8 opacity-60">
          Los planes se facturan mensualmente. Puedes cancelar o cambiar de plan en cualquier momento desde la configuración.
        </p>
      </div>
    </div>
  );
}
