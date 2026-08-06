import { Button } from "@/components/ui/button";
import { useRtl } from "@/hooks/use-rtl";
import { cn } from "@/lib/utils";
import { Languages } from "lucide-react";

/** Switches the whole interface between English (LTR) and العربية (RTL). */
export function RtlToggle({
  className,
  compact = false,
  variant = "outline",
}: {
  className?: string;
  compact?: boolean;
  variant?: "outline" | "ghost";
}) {
  const { isRtl, toggleRtl } = useRtl();

  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={toggleRtl}
      className={cn("gap-1.5", className)}
      aria-pressed={isRtl}
      title={isRtl ? "Switch to English (LTR)" : "Switch to العربية (RTL)"}
    >
      <Languages className="size-4" />
      {!compact && <span>{isRtl ? "English" : "العربية"}</span>}
    </Button>
  );
}
