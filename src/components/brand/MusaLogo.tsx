type Variant = "wordmark" | "monogram" | "combo";
type Color = "default" | "light";
type Size = "xs" | "sm" | "md" | "lg" | "xl";

// monogram.svg viewBox 0 0 2000 1609.04 → aspect ratio ≈ 1.243
const MONO_H: Record<Size, number> = { xs: 20, sm: 26, md: 34, lg: 46, xl: 64 };
const MONO_ASPECT = 2000 / 1609.04;

// wordmark.svg viewBox 0 0 1073.44 269.14 → aspect ratio ≈ 3.988
const WORD_H: Record<Size, number> = { xs: 12, sm: 15, md: 20, lg: 27, xl: 38 };
const WORD_ASPECT = 1073.44 / 269.14;

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
  const monoH = MONO_H[size];
  const monoW = Math.round(monoH * MONO_ASPECT);
  const monoSrc = color === "light" ? "/brand/monogram-light.svg" : "/brand/monogram.svg";

  const wordH = WORD_H[size];
  const wordW = Math.round(wordH * WORD_ASPECT);

  const mono = (
    <img
      src={monoSrc}
      width={monoW}
      height={monoH}
      alt=""
      aria-hidden="true"
      style={{ display: "block" }}
    />
  );

  const word = (
    <img
      src="/brand/wordmark.svg"
      width={wordW}
      height={wordH}
      alt=""
      aria-hidden="true"
      style={{
        display: "block",
        filter: color === "light" ? "brightness(0) invert(1)" : undefined,
      }}
    />
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
