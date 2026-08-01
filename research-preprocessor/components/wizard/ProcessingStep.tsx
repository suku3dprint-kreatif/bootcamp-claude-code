"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export const PROCESSING_STAGES = [
  "Mapping columns to variable codes",
  "Reverse coding Likert items",
  "Detecting & handling outliers",
  "Imputing missing values",
  "Validating against min/max ranges",
  "Generating clean CSV & data dictionary",
] as const;

export function ProcessingStep({
  stageIndex,
  progressPct,
}: {
  stageIndex: number;
  progressPct: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing your data</CardTitle>
        <CardDescription>This runs locally in your browser — hang tight.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Progress value={progressPct} />
        <ol className="flex flex-col gap-2">
          {PROCESSING_STAGES.map((label, index) => {
            const done = index < stageIndex;
            const active = index === stageIndex;
            return (
              <li key={label} className="flex items-center gap-3 text-sm">
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                    done && "bg-emerald-600 text-white",
                    active && "animate-pulse bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900",
                    !done && !active && "bg-slate-100 text-slate-400 dark:bg-slate-800",
                  )}
                >
                  {done ? "✓" : index + 1}
                </span>
                <span className={cn(!done && !active && "text-slate-400 dark:text-slate-500")}>
                  {label}
                </span>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
