type Variant = "wordmark" | "monogram" | "combo";
type Color = "default" | "light";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

// viewBox 0 0 116 100 — aspect ratio 1.16:1
const MONO_H: Record<Size, number> = { xs: 20, sm: 26, md: 34, lg: 46, xl: 64 };
const WORD_SZ: Record<Size, number> = { xs: 12, sm: 15, md: 20, lg: 27, xl: 38 };

function Monogram({ h, stroke }: { h: number; stroke: string }) {
  const w = Math.round(h * 1.16);
  return (
    <svg width={w} height={h} viewBox="0 0 116 100" fill="none" aria-hidden="true">
      {/* Left post */}
      <line x1="16" y1="10" x2="16" y2="90" stroke={stroke} strokeWidth="2.6" />
      <line x1="10" y1="10" x2="22" y2="10" stroke={stroke} strokeWidth="2" />
      <line x1="10" y1="90" x2="22" y2="90" stroke={stroke} strokeWidth="2" />
      {/* Inner diagonals */}
      <line x1="16" y1="10" x2="52" y2="58" stroke={stroke} strokeWidth="2" />
      <line x1="84" y1="10" x2="52" y2="58" stroke={stroke} strokeWidth="2" />
      {/* Right post */}
      <line x1="84" y1="10" x2="84" y2="90" stroke={stroke} strokeWidth="2.6" />
      <line x1="78" y1="10" x2="90" y2="10" stroke={stroke} strokeWidth="2" />
      <line x1="78" y1="90" x2="90" y2="90" stroke={stroke} strokeWidth="2" />
      {/* Flujo Orgánico Editorial — calligraphic swash */}
      <path
        d="M84,8 C92,2 114,4 110,18 C106,32 90,28 84,18"
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MusaLogo({
  variant = "wordmark",
  size = "md",
  color = "default",
  className = "",
}: {
  variant?: Variant;
  size?: Size;
  color?: Color;
  className?: string;
}) {
  const stroke = color === "light" ? "#F2EBE0" : "var(--color-on-surface)";
  const textColor = color === "light" ? "#F2EBE0" : "var(--color-on-surface)";

  const mono = <Monogram h={MONO_H[size]} stroke={stroke} />;

  const word = (
    <span
      className="font-display font-normal"
      style={{ fontSize: WORD_SZ[size], color: textColor, letterSpacing: "0.14em", lineHeight: 1 }}
    >
      MUSA
    </span>
  );

  if (variant === "monogram")
    return (
      <span className={`inline-flex items-center ${className}`} aria-label="MUSA">
        {mono}
      </span>
    );

  if (variant === "wordmark")
    return (
      <span className={`inline-flex items-center ${className}`} aria-label="MUSA">
        {word}
      </span>
    );

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label="MUSA">
      {mono}
      {word}
    </span>
  );
}
