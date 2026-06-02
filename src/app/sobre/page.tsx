import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import MusaLogo from "@/components/brand/MusaLogo";

export const metadata: Metadata = {
  title: "¿Qué es GetMusa? | Plataforma de Reservas de Belleza en Venezuela",
  description:
    "GetMusa es la primera plataforma de reservas de belleza en Venezuela. Reserva con manicuristas y profesionales en Maracaibo, Valencia y Caracas.",
  alternates: { canonical: "https://getmusa.app/sobre" },
};

const STATS = [
  { value: "500+",    label: "Profesionales activas"  },
  { value: "15,000+", label: "Reservas completadas"    },
  { value: "4",       label: "Ciudades en Venezuela"   },
  { value: "2025",    label: "Año de fundación"         },
];

const ABOUT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": ["WebPage", "AboutPage"],
  name: "¿Qué es GetMusa?",
  url: "https://getmusa.app/sobre",
  description:
    "GetMusa es la primera plataforma de reservas de belleza en Venezuela, fundada en 2025.",
  about: {
    "@type": "Organization",
    name: "GetMusa",
    url: "https://getmusa.app",
    foundingDate: "2025",
    areaServed: { "@type": "Country", name: "Venezuela" },
    description:
      "GetMusa conecta clientas con manicuristas, estilistas y especialistas de belleza en Maracaibo, Valencia y Caracas.",
  },
};

export default function SobrePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ABOUT_JSON_LD) }}
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
                href="/explore"
                className="font-ui text-[13px] text-on-surface-muted hover:text-on-surface transition-colors"
              >
                Explorar
              </Link>
              <Link
                href="/login"
                className="font-ui font-medium text-[13px] bg-on-surface text-surface px-4 py-2 rounded-full hover:opacity-85 transition-opacity"
              >
                Para profesionales
              </Link>
            </nav>
          </div>
        </header>

        <article className="max-w-4xl mx-auto px-5 pt-12 pb-20">

          {/* Hero */}
          <header className="mb-12">
            <p className="musa-sublabel text-on-surface-subtle mb-4">Sobre GetMusa</p>
            <h1
              className="font-display font-normal text-on-surface leading-[0.95] mb-6"
              style={{ fontSize: "clamp(36px, 5vw, 56px)", letterSpacing: "-0.025em" }}
            >
              ¿Qué es GetMusa?
            </h1>
            <div className="space-y-4 max-w-2xl">
              <p className="font-ui text-[16px] text-on-surface leading-relaxed">
                GetMusa es la primera plataforma de reservas de belleza en Venezuela.
                Fundada en 2025, conecta a clientas con manicuristas, estilistas,
                especialistas en cejas y otros profesionales de belleza en Maracaibo,
                Valencia y Caracas.
              </p>
              <p className="font-ui text-[15px] text-on-surface-muted leading-relaxed">
                A través de GetMusa, las clientas pueden descubrir profesionales,
                ver disponibilidad en tiempo real y reservar citas en segundos,
                sin necesidad de escribir por WhatsApp ni esperar respuesta.
              </p>
              <p className="font-ui text-[15px] text-on-surface-muted leading-relaxed">
                Para las profesionales, GetMusa ofrece agenda digital, perfil público,
                recordatorios automáticos a clientas y estadísticas de negocio.
              </p>
            </div>
          </header>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border-subtle rounded-xl overflow-hidden mb-16">
            {STATS.map(({ value, label }) => (
              <div key={label} className="bg-surface-raised text-center px-6 py-8">
                <p
                  className="font-display font-normal text-on-surface leading-none"
                  style={{ fontSize: "clamp(28px, 4vw, 44px)", letterSpacing: "-0.03em" }}
                >
                  {value}
                </p>
                <p className="font-ui text-[12px] text-on-surface-muted mt-2 leading-snug">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Para quién */}
          <section className="mb-14">
            <h2
              className="font-display font-normal italic text-on-surface mb-6"
              style={{ fontSize: "28px", letterSpacing: "-0.015em" }}
            >
              ¿Para quién es GetMusa?
            </h2>
            <ul className="space-y-4">
              {[
                "Para clientas que quieren reservar con sus profesionales sin complicaciones ni esperas.",
                "Para manicuristas y profesionales de belleza que quieren ordenar su agenda y crecer.",
                "Para salones que quieren visibilidad online y recibir reservas las 24 horas.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span
                    className="mt-1.5 w-[5px] h-[5px] rounded-full bg-primary flex-shrink-0"
                    aria-hidden="true"
                  />
                  <p className="font-ui text-[15px] text-on-surface-muted leading-relaxed">
                    {item}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* Ciudades */}
          <section className="mb-14">
            <h2
              className="font-display font-normal italic text-on-surface mb-4"
              style={{ fontSize: "28px", letterSpacing: "-0.015em" }}
            >
              ¿En qué ciudades opera GetMusa?
            </h2>
            <p className="font-ui text-[15px] text-on-surface-muted leading-relaxed max-w-xl">
              Actualmente disponible en{" "}
              <strong className="font-medium text-on-surface">Maracaibo</strong>,{" "}
              <strong className="font-medium text-on-surface">Valencia</strong> y{" "}
              <strong className="font-medium text-on-surface">Caracas</strong>.
              En expansión continua hacia nuevas ciudades de Venezuela.
            </p>
          </section>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/explore"
              className="inline-flex items-center gap-2 font-ui font-medium text-[14px] bg-primary text-on-primary px-6 py-3 rounded-full hover:bg-primary-hover transition-colors shadow-primary-sm"
            >
              Explorar profesionales
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 font-ui font-medium text-[14px] border border-border text-on-surface px-6 py-3 rounded-full hover:border-primary-border hover:text-primary transition-colors"
            >
              Soy profesional
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

        </article>

        {/* Footer */}
        <footer className="border-t border-border-subtle">
          <div className="max-w-4xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="font-ui text-[12px] text-on-surface-subtle">© 2026 GetMusa · Venezuela</p>
            <div className="flex items-center gap-5">
              <Link href="/explore" className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors">Explorar</Link>
              <Link href="/login"   className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors">Para profesionales</Link>
              <Link href="/"        className="font-ui text-[12px] text-on-surface-subtle hover:text-on-surface-muted transition-colors">Inicio</Link>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
