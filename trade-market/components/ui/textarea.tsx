import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentProps<"textarea">;

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-loss/60 aria-invalid:bg-loss-muted/40",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
