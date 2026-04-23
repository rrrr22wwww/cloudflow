import { cn } from "@/lib/utils";
import type { InputHTMLAttributes } from "react";

interface LabeledInputProps {
  id: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  step?: string | number;
  hint?: string;
  className?: string;
  labelClassName?: string;
}

export function LabeledInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  step,
  hint,
  className,
  labelClassName,
}: LabeledInputProps) {
  return (
    <label className={cn("grid gap-1.5 text-sm text-muted-foreground", labelClassName)} htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        step={step}
        className={cn(
          "h-10 rounded-md border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors focus:border-brand/40",
          className,
        )}
      />
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
