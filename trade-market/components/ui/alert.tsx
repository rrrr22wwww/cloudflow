import * as React from "react";
import { cn } from "@/lib/utils";

type AlertVariant = "default" | "destructive";

const alertVariants: Record<AlertVariant, string> = {
  default: "border-border bg-surface text-foreground",
  destructive: "border-loss/40 bg-loss-muted text-loss",
};

interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
}

function Alert({ className, variant = "default", ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(
        "grid w-full gap-1 rounded-md border px-2.5 py-2 text-xs",
        alertVariants[variant],
        className,
      )}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-title"
      className={cn("font-medium text-current", className)}
      {...props}
    />
  );
}

function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-slot="alert-description"
      className={cn("text-current/90", className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription };
