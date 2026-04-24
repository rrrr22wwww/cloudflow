import * as React from "react";
import { Input as InputPrimitive } from "@base-ui-components/react/input";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input">;

function Input({ className, type, ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-loss/60 aria-invalid:bg-loss-muted/40",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
