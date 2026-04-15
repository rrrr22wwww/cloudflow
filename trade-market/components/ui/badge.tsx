import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wide",
        variant === "success" && "border-gain/40 bg-gain-muted text-gain",
        variant === "danger" && "border-loss/40 bg-loss-muted text-loss",
        variant === "default" && "border-border bg-surface text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}
