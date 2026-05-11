import Image from "next/image";
import { cn } from "@/lib/cn";

function getInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const sizes = {
  xs:  "w-7 h-7 text-[10px]",
  sm:  "w-9 h-9 text-[12px]",
  md:  "w-11 h-11 text-[14px]",
  lg:  "w-14 h-14 text-[16px]",
  xl:  "w-18 h-18 text-[20px]",
  "2xl": "w-24 h-24 text-[26px]",
};

interface AvatarProps {
  src?: string | null;
  name?: string;
  size?: keyof typeof sizes;
  className?: string;
}

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const initials = name ? getInitials(name) : "?";

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden flex-shrink-0 bg-rose-100 flex items-center justify-center",
        sizes[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "Avatar"}
          fill
          className="object-cover"
          sizes="96px"
        />
      ) : (
        <span
          className="font-ui font-medium text-sienna-700 select-none leading-none"
          aria-hidden="true"
        >
          {initials}
        </span>
      )}
    </div>
  );
}
