import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans, DM_Mono } from "next/font/google";
import "./globals.css";
import BottomNavBar from "@/components/BottomNavBar";
import TopAppBar from "@/components/TopAppBar";
import { ToastProvider } from "@/components/ui/Toast";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
  title: "Musa – Gestión de Belleza",
  description: "Tu agenda, tu imagen, tu negocio. Gestión profesional para emprendedoras de belleza.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Musa",
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
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <meta name="application-name" content="Musa" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Musa" />
        <meta name="theme-color" content="#B5593E" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <link rel="manifest" href="/manifest.json" />
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
