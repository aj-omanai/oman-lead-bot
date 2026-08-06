import { CodeBlock } from "@/components/CodeBlock";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TOOLKIT_FILES } from "@/lib/toolkit";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Download, FileCode2 } from "lucide-react";
import { useState } from "react";

export function ScriptLibrary() {
  const [selectedId, setSelectedId] = useState(TOOLKIT_FILES[0].id);
  const selected = TOOLKIT_FILES.find((f) => f.id === selectedId)!;

  const downloadAll = () => {
    TOOLKIT_FILES.forEach((file, i) => {
      setTimeout(() => {
        const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file.name;
        anchor.click();
        URL.revokeObjectURL(url);
      }, i * 250);
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Script library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The complete, runnable Python toolkit — copy or download each file.
          </p>
        </div>
        <Button variant="outline" onClick={downloadAll} className="gap-2">
          <Download className="size-4" />
          Download all
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* File tree */}
        <div className="h-fit rounded-xl border border-border/80 bg-card p-2 shadow-sm">
          <p className="px-3 pb-2 pt-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            wasl-lead-gen/
          </p>
          <div className="flex flex-col gap-0.5">
            {TOOLKIT_FILES.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedId(file.id)}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-start text-sm transition-colors",
                  file.id === selectedId
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <FileCode2
                  className={cn(
                    "size-4 shrink-0",
                    file.id === selectedId ? "text-primary" : "text-muted-foreground/60",
                  )}
                />
                <span className="truncate font-mono text-[13px]">{file.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Code pane */}
        <motion.div
          key={selected.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="min-w-0"
        >
          <Card className="mb-3 border-border/80 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-mono text-base font-semibold">{selected.name}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">
                  {selected.description}
                </p>
              </div>
              <Badge variant="secondary" className="rounded-full bg-primary/5 text-primary">
                {selected.language}
              </Badge>
            </div>
          </Card>
          <CodeBlock code={selected.content} filename={selected.name} />
        </motion.div>
      </div>
    </div>
  );
}
