import { cn } from "@/lib/cn";

/* ─── SectionLabel ──────────────────────────────────────────────────────────
   The Cormorant tracked uppercase label used before every major content
   section. Replaces ad-hoc `font-ui font-bold uppercase` patterns.

   Usage:
     <SectionLabel>Hoy</SectionLabel>
     <SectionLabel withRule className="mb-6">Mis clientas</SectionLabel>
────────────────────────────────────────────────────────────────────────────── */
interface SectionLabelProps {
  children:   React.ReactNode;
  withRule?:  boolean;   // append the MUSA double rule below
  className?: string;
  as?:        "p" | "h2" | "h3";
}

export function SectionLabel({
  children,
  withRule  = false,
  as        = "p",
  className,
}: SectionLabelProps) {
  const Tag = as;

  return (
    <div className={cn("", className)}>
      <Tag className="musa-label">{children}</Tag>
      {withRule && <MusaRule className="mt-3" />}
    </div>
  );
}

/* ─── MusaRule ──────────────────────────────────────────────────────────────
   The MUSA brand signature — a stacked double rule:
     1px terracotta  (#B5593E) at 35% opacity, full width
     0.5px gold      (#C4996A) at 40% opacity, 55% width
   Use after hero headlines, section breaks, and card transitions.
────────────────────────────────────────────────────────────────────────────── */
interface MusaRuleProps {
  className?: string;
}

export function MusaRule({ className }: MusaRuleProps) {
  return (
    <div className={cn("space-y-[3px]", className)}>
      <div className="h-px bg-primary opacity-35 w-full" />
      <div className="h-[0.5px] bg-[#C4996A] opacity-40" style={{ width: "55%" }} />
    </div>
  );
}
