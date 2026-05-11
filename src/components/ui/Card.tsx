import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/utils";

/* ─── Base card ─────────────────────────────────────────────────────────────
   Use for any contained block. Avoid putting a card header with icon+title
   on the same line — that reads as a generic admin template.
   Instead, use <SectionLabel> above the card, or let content breathe.
────────────────────────────────────────────────────────────────────────────── */
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?:    boolean; // stronger shadow — use for modals / flyouts
  interactive?: boolean; // hover lift — use for clickable cards only
  padding?:     "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
};

export function Card({
  elevated    = false,
  interactive = false,
  padding     = "md",
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-raised border border-border-subtle rounded-2xl",
        elevated ? "shadow-primary-sm" : "shadow-none ring-1 ring-border",
        interactive &&
          "transition-all duration-[160ms] ease-out cursor-pointer hover:shadow-primary-sm hover:-translate-y-px active:scale-[0.99] active:shadow-none ring-1 ring-border",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─── Stat card ─────────────────────────────────────────────────────────────
   Used in dashboard for Esta semana / Este mes blocks.
   Number in Cormorant Light — never DM Sans bold at display size.
────────────────────────────────────────────────────────────────────────────── */
interface StatCardProps {
  label:       string;
  value:       number | string;
  unit?:       string;      // "citas", "completadas", etc.
  revenue?:    number;      // DM Mono secondary line
  loading?:    boolean;
  className?:  string;
  size?:       "sm" | "md"; // sm=32px, md=40px
}

export function StatCard({
  label,
  value,
  unit,
  revenue,
  loading   = false,
  size      = "md",
  className,
}: StatCardProps) {
  const fontSize = size === "sm" ? "32px" : "40px";

  if (loading) {
    return (
      <div className={cn("bg-surface-raised border border-border-subtle rounded-2xl p-5", className)}>
        <div className="space-y-2">
          <div className="w-20 h-3 rounded bg-surface-sunken animate-pulse" />
          <div className="w-10 h-10 rounded bg-surface-sunken animate-pulse" />
          <div className="w-24 h-3 rounded bg-surface-sunken animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("bg-surface-raised border border-border-subtle rounded-2xl p-5", className)}>
      <p className="musa-label mb-2">{label}</p>
      <p
        className="font-display font-light text-on-surface leading-none"
        style={{ fontSize }}
      >
        {value}
      </p>
      <div className="mt-1.5 space-y-0.5">
        {unit && (
          <p className="font-ui text-[12px] text-on-surface-muted">{unit}</p>
        )}
        {revenue != null && revenue > 0 && (
          <p className="font-mono text-[12px] text-on-surface-muted">
            {formatCurrency(revenue)}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Hero stat block ───────────────────────────────────────────────────────
   Full-width — used for the "4 citas hoy" hero on the dashboard.
   72px Cormorant Light number is the centrepiece.
────────────────────────────────────────────────────────────────────────────── */
interface HeroStatProps {
  label:       string;
  value:       number | string;
  unit?:       string;
  secondary?:  string; // DM Mono line (revenue, etc.)
  loading?:    boolean;
  className?:  string;
}

export function HeroStat({
  label,
  value,
  unit,
  secondary,
  loading   = false,
  className,
}: HeroStatProps) {
  if (loading) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="w-20 h-3 rounded bg-surface-sunken animate-pulse" />
        <div className="w-20 h-16 rounded bg-surface-sunken animate-pulse" />
        <div className="w-32 h-3 rounded bg-surface-sunken animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("", className)}>
      <p className="musa-label mb-4">{label}</p>
      <p
        className="font-display font-light text-on-surface leading-none"
        style={{ fontSize: "72px" }}
      >
        {value}
      </p>
      {unit && (
        <p className="font-ui text-[13px] text-on-surface-muted mt-1">{unit}</p>
      )}
      {secondary && (
        <p className="font-mono text-[13px] text-on-surface-muted mt-0.5">
          {secondary}
        </p>
      )}
    </div>
  );
}
