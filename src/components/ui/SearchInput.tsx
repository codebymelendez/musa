"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";

/* ─── SearchInput ───────────────────────────────────────────────────────────
   Branded search field with clear button. Used in Clients, Explore,
   and any search-first page.

   The search icon left-pads the input; the clear button appears only when
   there is a value. Both are implemented as positioned siblings so tab
   order stays clean.
────────────────────────────────────────────────────────────────────────────── */
interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  value:          string;
  onValueChange:  (val: string) => void;
  placeholder?:   string;
  className?:     string;
  containerClass?: string;
}

export function SearchInput({
  value,
  onValueChange,
  placeholder   = "Buscar…",
  className,
  containerClass,
  ...props
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn("relative", containerClass)}>
      {/* Magnifier */}
      <MagnifyingGlassIcon
        className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle pointer-events-none"
        aria-hidden="true"
      />

      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full h-11 pl-10 bg-surface-raised border border-border rounded-lg",
          "font-ui text-[14px] text-on-surface placeholder:text-on-surface-subtle",
          "transition-all duration-[160ms] outline-none",
          "focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(181,89,62,0.09)]",
          value ? "pr-10" : "pr-4",
          className
        )}
        {...props}
      />

      {/* Clear button — only when has value */}
      {value && (
        <button
          type="button"
          onClick={() => {
            onValueChange("");
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-on-surface-subtle hover:text-on-surface hover:bg-surface-sunken transition-colors"
          aria-label="Limpiar búsqueda"
        >
          <XMarkIcon className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
