import { cn } from "@/lib/cn";

/* ─── StatusDot ─────────────────────────────────────────────────────────────
   MUSA brand rule: status is communicated by a 7px coloured dot — never
   a pill badge. Dots are lighter on the eye and feel less like software.
   Use <StatusDot> for all appointment status indicators.
────────────────────────────────────────────────────────────────────────────── */
const dotColors: Record<string, string> = {
  pending:     "bg-border",
  confirmed:   "bg-primary",
  completed:   "bg-success",
  cancelled:   "bg-error",
  no_show:     "bg-error",
  rescheduled: "bg-warning",
  reprogrammed:"bg-warning",
};

const dotLabels: Record<string, string> = {
  pending:     "Pendiente",
  confirmed:   "Confirmada",
  completed:   "Completada",
  cancelled:   "Cancelada",
  no_show:     "No asistió",
  rescheduled: "Reprogramada",
  reprogrammed:"Reprogramada",
};

const dotTextColor: Record<string, string> = {
  pending:     "text-on-surface-muted",
  confirmed:   "text-primary",
  completed:   "text-success",
  cancelled:   "text-error",
  no_show:     "text-error",
  rescheduled: "text-warning",
  reprogrammed:"text-warning",
};

interface StatusDotProps {
  status:     string;
  showLabel?: boolean;    // inline label next to the dot
  size?:      "sm" | "md"; // sm=6px, md=7px
  className?: string;
}

export function StatusDot({
  status,
  showLabel  = false,
  size       = "md",
  className,
}: StatusDotProps) {
  const dotClass  = dotColors[status]    ?? "bg-border";
  const textClass = dotTextColor[status] ?? "text-on-surface-muted";
  const label     = dotLabels[status]    ?? status;
  const sizeClass = size === "sm" ? "w-[6px] h-[6px]" : "w-[7px] h-[7px]";

  if (!showLabel) {
    return (
      <div
        className={cn("rounded-full flex-shrink-0", sizeClass, dotClass, className)}
        title={label}
        aria-label={label}
      />
    );
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className={cn("rounded-full flex-shrink-0", sizeClass, dotClass)} />
      <span className={cn("font-ui text-[12px] font-medium", textClass)}>
        {label}
      </span>
    </div>
  );
}

/* ─── StatusBadge ───────────────────────────────────────────────────────────
   Kept for backward compatibility with older pages not yet migrated.
   Prefer <StatusDot showLabel> instead. Will be removed in a future pass.
────────────────────────────────────────────────────────────────────────────── */
const badgeSurface: Record<string, string> = {
  pending:     "bg-surface-sunken text-on-surface-muted",
  confirmed:   "bg-primary/8 text-primary",
  completed:   "bg-success-surface text-success",
  cancelled:   "bg-surface-sunken text-on-surface-subtle",
  no_show:     "bg-error-surface text-error",
  rescheduled: "bg-warning-surface text-warning",
  reprogrammed:"bg-warning-surface text-warning",
};

type StatusKey = keyof typeof badgeSurface;

interface StatusBadgeProps {
  status:    StatusKey;
  className?: string;
}

/** @deprecated Use <StatusDot showLabel> instead */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  const cls   = badgeSurface[status] ?? badgeSurface.pending;
  const label = dotLabels[status]    ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full font-ui font-medium text-[11px] leading-[1.4] tracking-[0.01em]",
        cls,
        className
      )}
    >
      {label}
    </span>
  );
}

/* ─── General-purpose Badge ─────────────────────────────────────────────────
   Use sparingly — for non-status labels like tags, categories, plan tiers.
   NOT for appointment status (use StatusDot).
────────────────────────────────────────────────────────────────────────────── */
const badgeVariants = {
  default: "bg-surface-sunken text-on-surface-muted",
  primary: "bg-primary/8 text-primary",
  success: "bg-success-surface text-success",
  warning: "bg-warning-surface text-warning",
  error:   "bg-error-surface text-error",
};

interface BadgeProps {
  children:   React.ReactNode;
  variant?:   keyof typeof badgeVariants;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full font-ui font-medium text-[11px] leading-[1.4]",
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
