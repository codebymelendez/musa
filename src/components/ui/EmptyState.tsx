import { cn } from "@/lib/cn";
import { Button } from "./Button";

/* ─── EmptyState ────────────────────────────────────────────────────────────
   MUSA brand rule: the headline is Cormorant Light Italic (~26px), not a
   DM Sans bold label. It reads like a caption in an editorial spread, not
   an error message. Keep copy warm and contextual.
────────────────────────────────────────────────────────────────────────────── */
interface EmptyStateProps {
  /* Editorial headline — keep under 40 characters */
  title:        string;
  description?: string;
  action?: {
    label:   string;
    onClick: () => void;
  };
  /* Optional Heroicon — keep at w-10 h-10, text-on-surface-subtle */
  icon?:       React.ReactNode;
  className?:  string;
  /* Use "compact" inside cards/sections, "page" for full-screen empties */
  size?:       "compact" | "page";
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  size      = "page",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-start justify-center",
        size === "page" ? "py-20 px-1" : "py-10 px-1",
        className
      )}
    >
      {icon && (
        <div className="text-on-surface-subtle mb-4 opacity-40">
          {icon}
        </div>
      )}

      {/* Cormorant headline — the editorial brand voice */}
      <p
        className="font-display italic font-light text-on-surface leading-snug"
        style={{ fontSize: "26px" }}
      >
        {title}
      </p>

      {description && (
        <p className="font-ui text-[13px] text-on-surface-muted mt-2 max-w-[300px] leading-relaxed">
          {description}
        </p>
      )}

      {action && (
        <div className="mt-6">
          <Button variant="secondary" size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
