import { cn } from "@/lib/utils";

/** Wasl brand mark — a growth arrow on a refined teal tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-5"
        aria-hidden
      >
        <path d="M4 17 10 11l4 4 6-7" />
        <path d="M15 8h5v5" />
      </svg>
    </div>
  );
}

export function Wordmark({
  className,
  light = false,
}: {
  className?: string;
  light?: boolean;
}) {
  return (
    <span
      className={cn(
        "text-[17px] font-bold tracking-tight",
        light ? "text-white" : "text-foreground",
        className,
      )}
    >
      Wasl
      <span className={light ? "text-teal-300" : "text-primary"}>.</span>
    </span>
  );
}
