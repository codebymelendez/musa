import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Encuentra tu profesional de belleza | GETMUSA",
  description:
    "Explora profesionales de belleza en Venezuela. Peluquería, manicure, maquillaje y más. Reserva tu cita online.",
  openGraph: {
    title: "Encuentra tu profesional de belleza | GETMUSA",
    description:
      "Explora y reserva con los mejores profesionales de belleza en Venezuela.",
    url: "https://getmusa.app/explore",
    type: "website",
  },
  alternates: {
    canonical: "https://getmusa.app/explore",
  },
};

export default function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
