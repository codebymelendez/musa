"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

/* ─── Select ────────────────────────────────────────────────────────────────
   Wraps a native <select> with brand styling and a custom chevron.
   Uses the native element for full accessibility and mobile UX.
   For richer dropdowns (searchable, multi), use a third-party component
   and apply the same border/focus/type system.
────────────────────────────────────────────────────────────────────────────── */
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?:    string;
  error?:    string;
  helper?:   string;
  options?:  SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helper, options, placeholder, children, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="musa-sublabel"
          >
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "w-full h-11 pl-3.5 pr-10",
              "bg-surface-raised border border-border rounded-md",
              "font-ui text-[15px] text-on-surface",
              "appearance-none cursor-pointer",
              "transition-all duration-[160ms] outline-none",
              "focus:border-border-focus focus:shadow-[0_0_0_3px_rgba(181,89,62,0.10)]",
              "disabled:bg-surface-sunken disabled:text-on-surface-disabled disabled:cursor-not-allowed",
              error &&
                "border-error focus:border-error focus:shadow-[0_0_0_3px_rgba(155,35,53,0.10)]",
              className
            )}
            aria-invalid={error ? "true" : undefined}
            aria-describedby={
              error    ? `${inputId}-error`
              : helper ? `${inputId}-helper`
              : undefined
            }
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.disabled}>
                    {o.label}
                  </option>
                ))
              : children}
          </select>

          <ChevronDownIcon
            className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle pointer-events-none"
            aria-hidden="true"
          />
        </div>

        {error && (
          <p id={`${inputId}-error`} className="font-ui text-[12px] text-error" role="alert">
            {error}
          </p>
        )}
        {helper && !error && (
          <p id={`${inputId}-helper`} className="font-ui text-[12px] text-on-surface-subtle">
            {helper}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
