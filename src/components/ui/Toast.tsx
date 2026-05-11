"use client";

import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";

type ToastVariant = "success" | "error" | "info";

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircleIcon className="w-5 h-5 text-success" />,
  error:   <XCircleIcon className="w-5 h-5 text-error" />,
  info:    <InformationCircleIcon className="w-5 h-5 text-primary" />,
};

function ToastItem({
  data,
  onRemove,
}: {
  data: ToastData;
  onRemove: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    timerRef.current = setTimeout(() => onRemove(data.id), 4000);
    return () => clearTimeout(timerRef.current);
  }, [data.id, onRemove]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-espresso-800 text-[#F5EDE8] rounded-xl px-4 py-3.5 shadow-primary-sm max-w-[360px] w-full animate-in slide-in-from-bottom-2 fade-in duration-200 font-ui text-[13px] font-medium"
      )}
      role="alert"
    >
      {icons[data.variant]}
      <span className="flex-1 leading-snug">{data.message}</span>
      <button
        onClick={() => onRemove(data.id)}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Descartar"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "info") => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-[calc(theme(spacing.28)+env(safe-area-inset-bottom,0px))] left-0 right-0 flex flex-col items-center gap-2 px-4 z-[300] pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full flex justify-center">
            <ToastItem data={t} onRemove={remove} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
