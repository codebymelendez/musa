"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const modalSizes = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  className,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-espresso-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={dialogRef}
        className={cn(
          "relative w-full bg-surface-raised rounded-2xl shadow-2xl animate-in zoom-in-95 fade-in duration-200 overflow-hidden",
          modalSizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border-subtle">
            <h2 className="font-ui font-semibold text-[16px] text-on-surface">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className={cn(!title && "pt-6")}>{children}</div>
      </div>
    </div>
  );
}

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: BottomSheetProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-espresso-900/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        className={cn(
          "relative w-full max-h-[90dvh] bg-surface-raised rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-y-auto",
          className
        )}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>

        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
            <h2 className="font-ui font-semibold text-[16px] text-on-surface">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-muted hover:bg-surface-sunken transition-colors"
              aria-label="Cerrar"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className={cn("pb-[max(1.5rem,env(safe-area-inset-bottom))]", !title && "pt-2")}>
          {children}
        </div>
      </div>
    </div>
  );
}
