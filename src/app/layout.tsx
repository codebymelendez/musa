import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import BottomNavBar from "@/components/BottomNavBar";
import TopAppBar from "@/components/TopAppBar";
import { ToastProvider } from "@/components/ui/Toast";

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
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
    apple: "/brand/apple-touch-icon.svg",
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
        <link rel="apple-touch-icon" href="/brand/apple-touch-icon.svg" />
      </head>
      <body
        className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable} font-body antialiased min-h-screen pb-32 tap-highlight-transparent`}
      >
        <ToastProvider>
          <TopAppBar />
          {children}
          <BottomNavBar />
        </ToastProvider>
      </body>
    </html>
  );
}
