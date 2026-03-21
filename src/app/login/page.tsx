"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [countryCode, setCountryCode] = useState("+58");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fullPhone = `${countryCode}${phone.replace(/\D/g, "")}`;

    try {
      if (isRegister) {
        await register({ phone: fullPhone, name, password });
      } else {
        await login({ phone: fullPhone, password });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface antialiased min-h-screen flex flex-col items-center justify-center p-6 relative">
      <main className="w-full max-w-md flex flex-col items-center gap-12 z-10">
        {/* Brand Identity */}
        <header className="text-center">
          <h1 className="font-headline font-extrabold text-5xl tracking-tighter text-primary mb-2">
            Musa
          </h1>
          <p className="font-body text-on-surface-variant text-lg tracking-tight">
            Gestión Profesional de Belleza
          </p>
        </header>

        {/* Login / Register Card */}
        <section className="w-full bg-surface-container-lowest rounded-[2rem] p-8 shadow-sm">
          <div className="mb-8">
            <h2 className="font-headline text-2xl font-bold text-on-surface mb-2">
              {isRegister ? "Crear cuenta" : "Bienvenida de nuevo"}
            </h2>
            <p className="font-body text-on-surface-variant">
              {isRegister
                ? "Regístrate para gestionar tu agenda."
                : "Ingresa tus datos para acceder a tu estudio."}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-error-container rounded-xl text-on-error-container text-sm font-medium">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Nombre (solo registro) */}
            {isRegister && (
              <div className="space-y-2">
                <label className="font-label text-sm font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                  Tu nombre
                </label>
                <input
                  className="w-full h-14 px-5 bg-surface-container-high border-none rounded-xl font-body text-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:bg-surface-bright transition-all"
                  placeholder="Ana López"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required={isRegister}
                />
              </div>
            )}

            {/* Teléfono */}
            <div className="space-y-2">
              <label className="font-label text-sm font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Número de Teléfono
              </label>
              <div className="flex gap-3">
                <div className="relative flex-none">
                  <select
                    className="appearance-none h-14 pl-4 pr-10 bg-surface-container-high border-none rounded-xl font-body text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-bright transition-all cursor-pointer"
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                  >
                    <option value="+58">+58</option>
                    <option value="+1">+1</option>
                    <option value="+34">+34</option>
                    <option value="+54">+54</option>
                    <option value="+57">+57</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
                <div className="flex-grow">
                  <input
                    className="w-full h-14 px-5 bg-surface-container-high border-none rounded-xl font-body text-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:bg-surface-bright transition-all"
                    placeholder="(000) 000-0000"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Contraseña */}
            <div className="space-y-2">
              <label className="font-label text-sm font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Contraseña
              </label>
              <input
                className="w-full h-14 px-5 bg-surface-container-high border-none rounded-xl font-body text-lg text-on-surface placeholder:text-outline focus:ring-2 focus:ring-primary focus:bg-surface-bright transition-all"
                placeholder="••••••••"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            {/* Submit */}
            <button
              className="editorial-gradient w-full h-14 rounded-full font-headline font-bold text-white text-lg shadow-lg active:scale-95 transition-transform duration-200 flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin">
                  progress_activity
                </span>
              ) : (
                <>
                  {isRegister ? "Crear cuenta" : "Iniciar sesión"}
                  <span className="material-symbols-outlined">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          {/* Cambiar modo */}
          <footer className="mt-8 text-center">
            <p className="font-body text-sm text-on-surface-variant">
              {isRegister ? "¿Ya tienes cuenta? " : "¿Nueva en Musa? "}
              <button
                type="button"
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                }}
                className="text-primary font-semibold hover:underline decoration-2 underline-offset-4"
              >
                {isRegister ? "Iniciar sesión" : "Crear cuenta"}
              </button>
            </p>
          </footer>
        </section>

        {/* Editorial aesthetic */}
        <div className="mt-12 flex flex-col items-center gap-6 opacity-40 grayscale pointer-events-none">
          <div className="grid grid-cols-2 gap-4 max-w-[280px]">
            <div className="h-24 w-24 rounded-2xl bg-surface-container-highest overflow-hidden relative">
              <Image
                className="object-cover"
                alt="Beauty professional tools"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqdZAXr5cSXTYf8OpyRKuG5WXvRx9MVZYw-cehTsCaJg3RqtqZZ9jYkaivqf9IExmoNpjiOO3FuSzDaFUDsodNdMIqWnWhKPFNwbz42doMPQgyaHf1cvzh9XrIwiSh_KLsGg0jn-ELGXUX7w4exRB-n9tuxjS4dLp-BhijbEGS6CaxthzHcQ1msZRY2JWT6ZzWEJQM1Fazu1s8CAk-zQMM5-eHGNHrSIGQt1bi8YlhFVLRGp3E5J1lmfnwqfy5Tyxvqp7botkTX6lL"
                fill
              />
            </div>
            <div className="h-24 w-24 rounded-full bg-surface-container-highest overflow-hidden self-end relative">
              <Image
                className="object-cover"
                alt="Makeup application"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBp9NaZ-5aWldHtxc-4bC67Pw7IkAhCTejCygmjKgbake7dkouLEpaNQG5xtR-0f0lqu992Z6imUcp4NroEjvFXtETYHHYsfrJTwc7I85HRlYYgpy2689lhkIuAQD-b-UhP0jbao1VXEJ9K1VG73074-q467R9lNECM9WON1IzSH1cbo6bSplPJDFZpvjvLhmPReVVSZPPoWRUnP0b465Wfj_aq-gs8dZVnuHX69-AnefxbTITYkR-QqUlZSbusJ4GnyEfE43Vd34L4"
                fill
              />
            </div>
          </div>
          <p className="font-headline italic text-on-surface-variant text-sm tracking-wide">
            Elevando el Arte a través de la Organización
          </p>
        </div>
      </main>

      {/* Legal */}
      <footer className="fixed bottom-8 flex gap-6 text-[11px] font-label font-medium uppercase tracking-widest text-on-surface-variant opacity-60">
        <Link className="hover:text-primary transition-colors" href="#">
          Privacidad
        </Link>
        <Link className="hover:text-primary transition-colors" href="#">
          Términos
        </Link>
        <Link className="hover:text-primary transition-colors" href="#">
          Soporte
        </Link>
      </footer>
    </div>
  );
}
