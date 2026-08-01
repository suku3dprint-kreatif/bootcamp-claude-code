import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-slate-950 [&>svg~*]:pl-7 dark:[&>svg]:text-slate-50",
  {
    variants: {
      variant: {
        default: "bg-white text-slate-950 border-slate-200 dark:bg-slate-950 dark:text-slate-50 dark:border-slate-800",
        destructive:
          "border-red-500/50 text-red-700 dark:text-red-400 dark:border-red-500 [&>svg]:text-red-600",
        warning:
          "border-amber-500/50 text-amber-800 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-500/40 [&>svg]:text-amber-600",
        success:
          "border-emerald-500/50 text-emerald-800 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-500/40 [&>svg]:text-emerald-600",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Alert({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>) {
  return (
    <div role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  );
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  );
}

export { Alert, AlertTitle, AlertDescription };
