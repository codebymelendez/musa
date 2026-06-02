import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRightIcon,
  CalendarDaysIcon,
  UserGroupIcon,
  BellAlertIcon,
  ChartBarIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import MusaLogo from "@/components/brand/MusaLogo";

export const metadata: Metadata = {
  title: "GetMusa para Profesionales de Belleza | Agenda Digital en Venezuela",
  description:
    "Gestiona tu agenda, recibe reservas online y haz crecer tu negocio de belleza en Venezuela. Perfil público, recordatorios automáticos y estadísticas. Gratis para empezar.",
  alternates: { canonical: "https://getmusa.app/para-profesionales" },
};

const SOFTWARE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "GetMusa",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Agenda digital y gestión de clientas para profesionales de belleza en Venezuela. Perfil público, reservas online y recordatorios automáticos.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Plan gratuito disponible",
  },
  url: "https://getmusa.app/login",
  countriesSupported: "VE",
};

const FEATURES = [
  {
    Icon: GlobeAltIcon,
    title: "Perfil público",
    desc: "Tu propio espacio en getmusa.app con tus servicios, precios y disponibilidad. Las clientas te encuentran por ciudad y especialidad.",
  },
  {
    Icon: CalendarDaysIcon,
    title: "Agenda digital",
    desc: "Tus clientas reservan solas desde tu perfil. Tú ves todo en un calendario y nunca pierdes una cita.",
  },
  {
    Icon: BellAlertIcon,
    title: "Recordatorios automáticos",
    desc: "Las clientas reciben recordatorios de su cita sin que tú hagas nada. Menos no-shows, más ingresos.",
  },
  {
    Icon: UserGroupIcon,
    title: "Gestión de clientas",
    desc: "Historial de citas, notas y datos de cada clienta en un solo lugar. Sin hojas de cálculo.",
  },
  {
    Icon: ChartBarIcon,
    title: "Estadísticas",
    desc: "Ve cuántas citas completaste, cuántos ingresos generaste y cuáles son tus servicios más populares.",
  },
  {
    Icon: DevicePhoneMobileIcon,
    title: "Funciona en el móvil",
    desc: "Instalable como app en tu teléfono. Gestiona tu negocio desde donde estés.",
  },
];

export default function ParaProfesionalesPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_JSON_LD) }}
      />
      <div className="min-h-screen bg-background animate-page">

        {/* Header */}
        <header className="sticky top-0 z-40 glass-nav border-b border-border-subtle">
          <div className="max-w-4xl mx-auto px-5 h-14 flex items-center justify-between">
            <Link href="/" aria-label="GetMusa inicio">
              <MusaLogo variant="wordmark" size="sm" />
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/sobre"
                className="font-ui text-[13px] text-on-surface-muted hover:text-on-surface transition-colors"
              >
                Qué es GetMusa
              </Link>
              <Link
                href="/login"
                className="font-ui font-medium text-[13px] bg-primary text-on-primary px-4 py-2 rounded-full hover:bg-primary-hover transition-colors shadow-primary-sm"
              >
                Empezar gratis
              </Link>
            </nav>
          </div>
        </header>

        <main>

          {/* Hero */}
          <section className="max-w-4xl mx-auto px-5 pt-14 pb-12">
            <p className="musa-sublabel text-on-surface-subtle mb-4">Para profesionales de belleza</p>
            <h1
              className="font-display font-normal text-on-surface leading-[0.95] mb-6 max-w-2xl"
              style={{ fontSize: "clamp(34px, 5vw, 56px)", letterSpacing: "-0.025em" }}
            >
              Tu negocio de belleza,
              <em className="block font-light italic text-primary" style={{ marginTop: "0.04em" }}>
                sin WhatsApp.
              </em>
            </h1>
            <p className="font-ui text-[16px] text-on-surface-muted leading-relaxed max-w-lg mb-8">
              GetMusa te da agenda digital, perfil público y recordatorios automáticos.
              Tus clientas reservan solas. Tú solo trabajas.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 font-ui font-medium text-[14px] bg-primary text-on-primary px-7 py-3.5 rounded-full hover:bg-primary-hover transition-colors shadow-primary-sm"
              >
                Empezar gratis
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 font-ui font-medium text-[14px] border border-border text-on-surface-muted px-6 py-3.5 rounded-full hover:border-primary-border hover:text-on-surface transition-colors"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </section>

          {/* Features grid */}
          <section className="max-w-4xl mx-auto px-5 pb-16">
            <p className="musa-sublabel text-on-surface-subtle mb-8">Todo incluido</p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5">
              {FEATURES.map(({ Icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-surface-raised border border-border-subtle rounded-xl p-5 shadow-xs"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary-surface flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-ui font-medium text-[15px] text-on-surface mb-1.5">
                    {title}
                  </h2>
                  <p className="font-ui text-[13px] text-on-surface-muted leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA dark */}
          <section className="max-w-4xl mx-auto px-5 pb-16">
            <div
              className="rounded-2xl px-8 py-12 md:px-12 md:py-14"
              style={{ background: "#1A0E0B" }}
            >
              <p
                className="font-ui font-medium text-[10.5px] uppercase tracking-[0.12em] mb-5"
                style={{ color: "rgba(255,255,255,0.45)" }}
              >
                Gratis para empezar
              </p>
              <h2
                className="font-display font-normal text-on-primary leading-[0.95] mb-4 max-w-md"
                style={{ fontSize: "clamp(26px, 3.5vw, 38px)", letterSpacing: "-0.02em" }}
              >
                Crea tu perfil en menos de 10 minutos.
              </h2>
              <p
                className="font-ui text-[14px] leading-relaxed mb-8 max-w-sm"
                style={{ color: "rgba(255,255,255,0.55)" }}
              >
                Sin tarjeta de crédito. Sin instalaciones. Solo entra y empieza.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 font-ui font-medium text-[14px] bg-primary text-on-primary px-7 py-3.5 rounded-full hover:bg-primary-hover transition-colors shadow-primary-sm"
              >
                Empezar gratis
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </section>

        </main>

        {/* Footer */}
        <footer className="border-t border-border-subtle">
          <div className="max-w-4xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-ui text-[12px] text-on-surface-subtle">© 2026 GetMusa · Venezuela</p>
            <div className="flex items-center gap-5">
              <Link href="/explore" className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors">Explorar</Link>
              <Link href="/sobre"   className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors">Qué es GetMusa</Link>
              <Link href="/"        className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors">Inicio</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
