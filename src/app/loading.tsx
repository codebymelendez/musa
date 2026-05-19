import MusaLogo from "@/components/brand/MusaLogo";

export default function Loading() {
  return (
    <div className="fixed inset-0 bg-background z-[200] flex flex-col items-center justify-center gap-6">
      <MusaLogo variant="monogram" size="xl" />
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1 h-1 rounded-full bg-on-surface-subtle animate-pulse"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}
