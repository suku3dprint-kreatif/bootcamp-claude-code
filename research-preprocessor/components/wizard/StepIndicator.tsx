import { cn } from "@/lib/utils";

const STEPS = ["Upload", "Preview", "Process", "Results"] as const;

export function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 sm:gap-4">
      {STEPS.map((label, index) => {
        const stepNumber = index + 1;
        const isDone = stepNumber < current;
        const isCurrent = stepNumber === current;
        return (
          <li key={label} className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  isDone && "bg-emerald-600 text-white",
                  isCurrent && "bg-slate-900 text-white dark:bg-slate-50 dark:text-slate-900",
                  !isDone && !isCurrent && "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                )}
              >
                {isDone ? "✓" : stepNumber}
              </span>
              <span
                className={cn(
                  "hidden text-sm font-medium sm:inline",
                  isCurrent ? "text-slate-950 dark:text-slate-50" : "text-slate-500 dark:text-slate-400",
                )}
              >
                {label}
              </span>
            </div>
            {stepNumber < STEPS.length && (
              <div className="h-px w-6 bg-slate-200 sm:w-10 dark:bg-slate-800" />
            )}
          </li>
        );
      })}
    </ol>
  );
}
