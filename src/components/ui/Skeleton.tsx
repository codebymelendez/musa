import { cn } from "@/lib/cn";

/* ─── Skeleton primitives ───────────────────────────────────────────────────
   Always use bg-surface-sunken (not hardcoded colors) so they work in
   both light and dark mode. Never use spinners — skeletons match the
   shape of the content they precede.
────────────────────────────────────────────────────────────────────────────── */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-sunken", className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/* ─── Greeting skeleton — matches Home greeting block ─── */
export function SkeletonGreeting() {
  return (
    <div className="space-y-2" aria-hidden="true">
      <Skeleton className="w-56 h-9 rounded" />
      <Skeleton className="w-32 h-3 rounded" />
    </div>
  );
}

/* ─── Appointment row skeleton — matches the editorial list row ─── */
export function SkeletonAppointmentRow({ wide = false }: { wide?: boolean }) {
  return (
    <div
      className="py-4 border-t border-border-subtle flex items-start gap-4"
      aria-hidden="true"
    >
      <Skeleton className="w-12 h-4 flex-shrink-0 mt-1" />
      <div className="flex-1 space-y-2.5">
        <Skeleton className="h-[15px]" style={{ width: wide ? "60%" : "45%" }} />
        <Skeleton className="h-[11px]" style={{ width: wide ? "40%" : "28%" }} />
      </div>
    </div>
  );
}

/* ─── Stat card skeleton — matches StatCard / dashboard cards ─── */
export function SkeletonStatCard() {
  return (
    <div
      className="bg-surface-raised border border-border-subtle rounded-2xl p-5 space-y-2"
      aria-hidden="true"
    >
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-10 w-10" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

/* ─── KPI card skeleton ─── */
export function SkeletonKPI() {
  return (
    <div
      className="bg-surface-raised border border-border-subtle rounded-2xl p-5 space-y-3"
      aria-hidden="true"
    >
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-9 w-2/3" />
    </div>
  );
}

/* ─── Generic card skeleton ─── */
export function SkeletonCard() {
  return (
    <div
      className="bg-surface-raised border border-border-subtle rounded-2xl p-5 space-y-3"
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
    </div>
  );
}

/* ─── List row skeleton ─── */
export function SkeletonRow({ lines = 2 }: { lines?: 2 | 3 }) {
  return (
    <div className="flex items-center gap-4 py-4 px-1" aria-hidden="true">
      <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-1/3" />
        {lines >= 2 && <Skeleton className="h-3 w-1/4" />}
      </div>
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

/* ─── Form field skeleton ─── */
export function SkeletonField() {
  return (
    <div className="space-y-1.5" aria-hidden="true">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
  );
}
