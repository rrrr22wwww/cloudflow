import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "default" | "sm" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand/90 border border-brand/70 shadow-[0_0_0_1px_hsl(var(--brand)/0.2)]",
  secondary: "bg-surface-raised text-foreground border border-border hover:border-brand/40",
  ghost: "bg-transparent text-foreground border border-border/0 hover:bg-surface-raised hover:border-border",
};

const sizes: Record<ButtonSize, string> = {
  default: "h-10 px-4 text-sm",
  sm: "h-8 px-3 text-xs",
  lg: "h-11 px-5 text-sm",
};

export function buttonClasses({
  variant = "secondary",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center justify-center rounded-md font-medium transition-all duration-200 ease-spring",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 disabled:pointer-events-none disabled:opacity-50",
    "[font-variation-settings:'wght'_450] hover:[font-variation-settings:'wght'_600]",
    variants[variant],
    sizes[size],
    className,
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={buttonClasses({ variant, size, className })}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";
