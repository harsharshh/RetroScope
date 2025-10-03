import ThemeToggle from "@/components/ThemeToggle";

export default function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-4 pt-8 sm:px-10">
      <div className="flex items-center gap-2 text-lg font-semibold text-foreground">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-surface-border bg-surface shadow-sm backdrop-blur">
          <span className="bg-retroscope-gradient bg-clip-text text-lg font-bold text-transparent">R</span>
        </div>
        <span className="bg-retroscope-gradient bg-clip-text text-2xl font-semibold text-transparent">
          RetroScope
        </span>
      </div>
      <ThemeToggle />
    </header>
  );
}

