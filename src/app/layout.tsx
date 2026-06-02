import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import BottomNavBar from "@/components/BottomNavBar";
import TopAppBar from "@/components/TopAppBar";
import { ToastProvider } from "@/components/ui/Toast";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MUSA – Gestión de Belleza",
  description: "Tu agenda, tu imagen, tu negocio. Gestión profesional para emprendedoras de belleza.",
  metadataBase: new URL("https://getmusa.app"),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MUSA",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <meta name="application-name" content="MUSA" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="MUSA" />
        <meta name="theme-color" content="#B5593E" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/brand/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/favicon.png" type="image/png" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
        {/* Hreflang + geo country signals */}
        <link rel="alternate" hrefLang="es-VE" href="https://getmusa.app/" />
        <link rel="alternate" hrefLang="es" href="https://getmusa.app/" />
        <meta name="geo.region" content="VE" />
        <meta name="geo.placename" content="Venezuela" />
        {/* Organization schema — sitewide */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "GetMusa",
              alternateName: "Musa",
              url: "https://getmusa.app",
              logo: "https://getmusa.app/brand/wordmark.svg",
              description:
                "GetMusa es la primera plataforma de reservas de belleza en Venezuela. Conecta clientas con manicuristas, estilistas y especialistas de belleza en Maracaibo, Valencia y Caracas.",
              foundingDate: "2025",
              foundingLocation: { "@type": "Place", name: "Venezuela" },
              areaServed: { "@type": "Country", name: "Venezuela" },
              sameAs: [
                "https://www.instagram.com/getmusa.app",
                "https://www.linkedin.com/company/getmusa",
              ],
            }),
          }}
        />
      </head>
      <body
        className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable} font-body antialiased min-h-screen pb-32 tap-highlight-transparent`}
      >
        <ServiceWorkerRegistration />
        <ToastProvider>
          <TopAppBar />
          {children}
          <BottomNavBar />
        </ToastProvider>
      </body>
    </html>
  );
}
