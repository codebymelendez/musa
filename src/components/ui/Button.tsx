"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/* ─── Variants ────────────────────────────────────────────────────────────── */
const variants = {
  /* Filled — primary action */
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover active:bg-primary-active shadow-primary-sm hover:shadow-primary-md",

  /* Outlined — secondary action */
  secondary:
    "border border-border bg-transparent text-on-surface hover:bg-surface-sunken hover:border-border-focus",

  /* Text-level — tertiary / navigation */
  ghost:
    "bg-transparent text-primary hover:bg-primary/8",

  /* Destructive — archive, cancel, delete */
  destructive:
    "bg-error-surface text-error hover:bg-error hover:text-on-error",

  /* Muted — passive / low-priority action */
  muted:
    "bg-surface-sunken text-on-surface-muted hover:bg-surface-raised hover:text-on-surface border border-transparent hover:border-border-subtle",

  /* Pill outline — used for quick-action chips */
  outline:
    "border border-border text-on-surface-muted hover:border-primary hover:text-primary bg-transparent",
};

/* ─── Sizes ───────────────────────────────────────────────────────────────── */
const sizes = {
  xs: "h-7  px-2.5  text-[12px] gap-1",
  sm: "h-9  px-3.5  text-[13px] gap-1.5",
  md: "h-11 px-5    text-[14px] gap-2",
  lg: "h-[52px] px-6 text-[15px] gap-2",
  /* Square icon button — use with a single icon child */
  icon: "h-9 w-9 p-0",
};

/* ─── Props ───────────────────────────────────────────────────────────────── */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
  /* Pill shape — pass true for rounded-full, false (default) for rounded-full already applied */
  pill?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant  = "primary",
      size     = "md",
      loading  = false,
      disabled,
      className,
      children,
      ...props
    },
    ref
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        /* Base */
        "inline-flex items-center justify-center rounded-full",
        "font-ui font-semibold tracking-[0.005em]",
        "transition-all duration-[160ms] ease-out",
        "active:scale-[0.97]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        "select-none focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : (
        children
      )}
    </button>
  )
);
Button.displayName = "Button";
