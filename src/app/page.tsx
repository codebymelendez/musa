"use client";

import Image from "next/image";
import Link from "next/link";

export default function Onboarding() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased overflow-hidden min-h-screen">
      {/* Top AppBar (Onboarding Context: Logo Only) */}
      <header className="fixed top-0 w-full z-50 flex justify-center items-center h-16 bg-white/80 backdrop-blur-md">
        <h1 className="font-headline font-bold text-xl text-primary tracking-tight">
          Atelier
        </h1>
      </header>

      <main className="h-screen flex flex-col justify-between pt-16 pb-12 overflow-hidden">
        {/* Onboarding Carousel Simulation (Using Flex Layout) */}
        <div className="flex-grow flex flex-col items-center justify-center px-8 text-center max-w-lg mx-auto w-full">
          {/* Asymmetric Illustration Container */}
          <div className="relative w-full aspect-square mb-12">
            {/* Decorative Shapes */}
            <div className="absolute inset-0 bg-secondary-fixed opacity-20 rounded-[40%_60%_70%_30%/40%_50%_60%_40%] scale-110"></div>
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary-fixed opacity-30 rounded-full blur-2xl"></div>

            {/* Main Illustration (Organic Asymmetry) */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              {/* Current Active Slide Image: Organiza tu agenda */}
              <div className="w-4/5 h-4/5 bg-surface-container-lowest rounded-3xl shadow-[0_20px_40px_rgba(0,0,0,0.04)] flex flex-col p-6 border-b-4 border-primary">
                <div className="flex items-center gap-3 mb-6">
                  <span className="material-symbols-outlined text-primary text-3xl">
                    calendar_today
                  </span>
                  <div className="h-2 w-24 bg-surface-container rounded-full"></div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-secondary"></div>
                    <div className="h-2 flex-grow bg-surface-container-high rounded-full"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-tertiary"></div>
                    <div className="h-2 w-3/4 bg-surface-container-high rounded-full"></div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <div className="h-2 w-1/2 bg-surface-container-high rounded-full"></div>
                  </div>
                </div>

                {/* Secondary Illustration: Beauty Tool */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 transform rotate-12 drop-shadow-lg bg-surface-container-lowest p-2 rounded-2xl">
                  <div className="relative w-full h-full">
                    <Image
                      alt="Cosmetic brushes"
                      className="object-cover rounded-xl"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuBByO_--kt1nKMiw17qbBrgtnGkSr_7CVXkZBRwL3u0Uexa2b2iNwzsvXy1OGEMM50HhhBqqs668e5UNA2B-JxGJsrKC7I2xur2InbgU3yivM-7vBT1LKot4zw0S1VEsqeR8MvQ3_-8h4yUrrGMAocNUvek9hEKNBRw7Cw8DZ6V_gasDIF1wTr8I5gV3HBipJlqbcZpYKYyda6GwN-sw31fpq5L5w8S3rcG4GIL_YN8kgHWFuBArUJfByxp_WaPpMZ0FnL17Q8csuD4"
                      fill
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="space-y-4">
            <h2 className="font-headline text-3xl font-extrabold text-on-surface leading-tight">
              Organiza tu agenda
            </h2>
            <p className="text-on-surface-variant text-lg leading-relaxed px-4">
              Mantén el control de todas tus citas de forma sencilla.
            </p>
          </div>

          {/* Page Indicators */}
          <div className="flex gap-2 mt-8">
            <div className="w-8 h-2 rounded-full bg-primary"></div>
            <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
            <div className="w-2 h-2 rounded-full bg-outline-variant"></div>
          </div>
        </div>

        {/* Sticky Footer CTA */}
        <div className="px-8 pb-4">
          <Link href="/login" className="block w-full">
            <button className="w-full h-[56px] bg-gradient-to-br from-primary to-primary-container text-on-primary font-headline font-bold text-lg rounded-full shadow-lg shadow-primary/20 active:scale-[0.98] transition-all">
              Empezar
            </button>
          </Link>
          <p className="mt-4 text-center text-on-surface-variant text-sm font-medium">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-primary font-bold">
              Inicia sesión
            </Link>
          </p>
        </div>
      </main>

      {/* Background Accents (Editorial Aesthetics) */}
      <div className="fixed top-1/4 -left-20 w-64 h-64 bg-secondary-fixed opacity-10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="fixed bottom-1/4 -right-20 w-80 h-80 bg-primary-fixed opacity-10 rounded-full blur-3xl pointer-events-none"></div>
    </div>
  );
}
