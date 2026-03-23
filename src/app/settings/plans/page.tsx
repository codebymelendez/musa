"use client";

import { useAppStore } from "@/store/useAppStore";
import { useRouter } from "next/navigation";
import Link from "next/link";


const PLANS = [
  {
    name: "FREE",
    price: "0",
    currency: "Bs",
    features: [
      "Hasta 20 citas / mes",
      "1 profesional (tú)",
      "Gestión de clientes",
      "Calendario online",
    ],
    description: "Para probar y enganchar",
    isCurrent: true,
  },
  {
    name: "PRO",
    price: "8",
    currency: "USD",
    features: [
      "Citas ilimitadas",
      "Clientas ilimitadas",
      "Estadísticas completas",
      "Push Notifications",
      "Promociones & Marketing",
    ],
    description: "Ideal para independientes",
    isCurrent: false,
    highlight: true,
  },
  {
    name: "TEAM",
    price: "5",
    currency: "USD",
    features: [
      "Dueño + Staff (hasta 10)",
      "Agenda unificada",
      "Control de staff",
      "Todo lo de PRO incluido",
    ],
    description: "Para equipos y salones",
    isCurrent: false,
    perProfessional: true,
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
                    <div className="flex items-center justify-between mb-1">
                      <h2 className="text-2xl font-black">{plan.name}</h2>
                      {plan.perProfessional && (
                        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold uppercase">Por Profesional</span>
                      )}
                    </div>
                    <p className={`text-xs mb-4 opacity-80 font-medium`}>{plan.description}</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">
                        {plan.currency === "USD" ? "$" : ""}{plan.price}{plan.currency === "Bs" ? " Bs" : ""}
                      </span>
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
                    <Link 
                      href={`/settings/plans/payment?plan=${plan.name}`}
                      className={`w-full h-14 rounded-2xl font-bold transition-transform active:scale-95 flex items-center justify-center gap-2 ${
                        plan.highlight 
                          ? 'bg-on-primary text-primary' 
                          : 'bg-primary text-on-primary'
                      }`}
                    >
                      {plan.name === "FREE" ? "Seleccionar" : "Actualizar ahora"}
                      <span className="material-symbols-outlined">arrow_forward</span>
                    </Link>
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
