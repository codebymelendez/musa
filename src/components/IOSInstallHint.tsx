"use client";

import { useEffect, useState } from "react";
import { XMarkIcon, ArrowUpOnSquareIcon } from "@heroicons/react/24/outline";

const STORAGE_KEY = "musa_ios_hint_dismissed";

export default function IOSInstallHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Solo iOS Safari, no en standalone (ya instalado), no si fue descartado
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua);
    const isSafari =
      /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
    const isStandalone =
      ("standalone" in navigator && (navigator as any).standalone === true) ||
      window.matchMedia("(display-mode: standalone)").matches;
    const dismissed = localStorage.getItem(STORAGE_KEY) === "1";

    if (isIOS && isSafari && !isStandalone && !dismissed) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 px-5 pb-6 pt-4"
      style={{ background: "var(--color-surface-raised)", borderTop: "1px solid var(--color-border-subtle)" }}
    >
      <div className="max-w-md mx-auto flex items-start gap-3">
        <ArrowUpOnSquareIcon
          className="w-5 h-5 flex-shrink-0 mt-0.5 text-primary"
          aria-hidden="true"
        />
        <p className="flex-1 font-ui text-[13px] text-on-surface-muted leading-relaxed">
          Para instalar MUSA en iPhone, toca{" "}
          <span className="font-medium text-on-surface">Compartir</span> en Safari
          y elige{" "}
          <span className="font-medium text-on-surface">
            Añadir a pantalla de inicio
          </span>
          .
        </p>
        <button
          onClick={dismiss}
          className="flex-shrink-0 p-1 -mr-1 text-on-surface-subtle hover:text-on-surface transition-colors"
          aria-label="Cerrar sugerencia"
        >
          <XMarkIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
