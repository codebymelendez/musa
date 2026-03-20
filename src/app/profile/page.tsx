"use client";

import Image from "next/image";

export default function Profile() {
  return (
    <main className="max-w-screen-md mx-auto px-6 pt-24 space-y-8 pb-32">
      {/* Profile Header Section */}
      <section className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-surface-container-lowest shadow-sm relative">
            <Image
              className="object-cover"
              alt="Ana Lopez stylist professional profile"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJS_mVOOFGTy9oELG6bXOVKXdM8RLvm8OqY0YtdyUKEoh1ty0UIUn4cXVWy9A4XiKaDUdaAh8fmcxn_rCrPzg6fhESHcT9OUXs3Wy1xUYKSxgBGjMjWxOrxQk0_IvZhCyDy1zzh7MWb-sucm6L0MGJg6AnslhRfCXaIObsgbFABvcJPLlOY3l2IpTx_Ocbr1W99GfeAwXb1lz45GCcIws6V0UcX-_ZXu5Mi64wbKr0jlKh3asqAMcTnU3ra44q5I64bz0Fr0J9Jnk8"
              fill
            />
          </div>
          <button className="absolute bottom-1 right-1 bg-primary text-on-primary p-2 rounded-full shadow-lg border-2 border-surface-container-lowest active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
        </div>
        <div>
          <h2 className="text-2xl font-extrabold text-on-surface tracking-tight">
            Ana Lopez
          </h2>
          <p className="text-on-surface-variant font-medium">Estilista Senior</p>
        </div>
      </section>

      {/* Bento Grid: Mi Negocio */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Horario Card */}
        <section className="bg-surface-container-lowest rounded-xl p-6 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border-l-4 border-primary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              schedule
            </span>
            <h3 className="font-bold text-on-surface">Mi Negocio</h3>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
              <span className="text-sm font-medium text-on-surface-variant">
                Lunes a Viernes
              </span>
              <span className="text-sm font-bold text-on-surface">
                9:00 - 18:00h
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium text-on-surface-variant">
                Sábado y Domingo
              </span>
              <span className="text-sm font-bold text-error">Cerrado</span>
            </div>
          </div>
          <button className="w-full py-2.5 text-sm font-semibold text-primary bg-primary/5 rounded-full hover:bg-primary/10 transition-colors">
            Editar Horarios
          </button>
        </section>

        {/* Contacto Card */}
        <section className="bg-surface-container-lowest rounded-xl p-6 space-y-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)] border-l-4 border-tertiary">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-tertiary">
              contact_support
            </span>
            <h3 className="font-bold text-on-surface">Canales de Contacto</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-surface-container-low rounded-lg">
              <span className="material-symbols-outlined text-[#25D366]">
                chat
              </span>
              <div className="flex-1">
                <p className="text-xs text-on-surface-variant font-medium">
                  WhatsApp
                </p>
                <p className="text-sm font-bold text-on-surface">
                  +34 600 000 000
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-surface-container-low rounded-lg">
              <span className="material-symbols-outlined text-[#E1306C]">
                photo_camera
              </span>
              <div className="flex-1">
                <p className="text-xs text-on-surface-variant font-medium">
                  Instagram
                </p>
                <p className="text-sm font-bold text-on-surface">
                  @ana_beauty_studio
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Enlace de Reserva: Glassmorphism effect card */}
      <section className="relative overflow-hidden bg-primary/5 rounded-2xl p-6 border border-primary/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-primary">
              Enlace de Reserva
            </h3>
            <p className="text-sm text-on-surface-variant">
              Comparte este link con tus clientes para recibir citas directas.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="px-4 py-2 bg-white rounded-lg border border-outline-variant/30 text-sm font-mono text-on-surface-variant truncate max-w-[180px]">
              aura.pro/ana-lopez
            </div>
            <button className="bg-primary hover:bg-primary-container text-on-primary px-6 py-2 rounded-full font-bold text-sm shadow-md transition-all active:scale-95 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">
                content_copy
              </span>
              Copiar
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-center p-4 bg-white/40 backdrop-blur-sm rounded-xl border border-white/50 cursor-pointer">
          <button className="text-primary font-bold text-sm flex items-center gap-2">
            <span className="material-symbols-outlined">visibility</span>
            Previsualizar mi perfil público
          </button>
        </div>
      </section>

      {/* Gestión de Cuenta */}
      <section className="bg-surface-container-low rounded-2xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-outline-variant/10">
          <h3 className="font-bold text-on-surface">Gestión de Cuenta</h3>
        </div>
        <div className="divide-y divide-outline-variant/10">
          <div className="flex items-center justify-between px-6 py-4 hover:bg-black/5 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant">
                language
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">Idioma</p>
                <p className="text-xs text-on-surface-variant">
                  Español (España)
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">
              chevron_right
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-4 hover:bg-black/5 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-on-surface-variant">
                stars
              </span>
              <div>
                <p className="text-sm font-bold text-on-surface">Mi Plan</p>
                <p className="text-xs text-primary font-bold">
                  Plan Pro (Renueva en 15 días)
                </p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant">
              chevron_right
            </span>
          </div>
          <div className="flex items-center justify-between px-6 py-4 hover:bg-error/5 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <span className="material-symbols-outlined text-error">
                logout
              </span>
              <p className="text-sm font-bold text-error">Cerrar Sesión</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
