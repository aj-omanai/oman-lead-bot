import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Copy, Download } from "lucide-react";
import { useMemo, useState } from "react";

interface CodeBlockProps {
  code: string;
  filename?: string;
  maxHeight?: string;
  className?: string;
}

/** Monospace code viewer with line numbers, copy-to-clipboard and download. */
export function CodeBlock({
  code,
  filename = "script.py",
  maxHeight = "28rem",
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = useMemo(() => code.replace(/\n$/, "").split("\n"), [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard may be unavailable; fall back silently.
    }
  };

  const download = () => {
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-[#0d1414] shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-white/15" />
            <span className="size-2.5 rounded-full bg-teal-400/60" />
          </span>
          <span className="ms-1 font-mono text-[11px] text-white/60">
            {filename}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={copy}
            className="h-7 w-7 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="size-3.5 text-teal-300" />
            ) : (
              <Copy className="size-3.5" />
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={download}
            className="h-7 w-7 text-white/60 hover:bg-white/10 hover:text-white"
            aria-label="Download file"
          >
            <Download className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight }}>
        <pre className="min-w-max px-4 py-3 font-mono text-[12.5px] leading-[1.65] text-teal-50/90">
          {lines.map((line, index) => (
            <div key={index} className="flex">
              <span className="w-8 shrink-0 select-none pr-4 text-right text-white/25">
                {index + 1}
              </span>
              <span className="whitespace-pre text-white/85">{line || " "}</span>
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}
