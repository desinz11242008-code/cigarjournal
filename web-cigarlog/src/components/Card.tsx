import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Bordered surface used across detail screens. */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-5 shadow-[0_1px_0_0_hsl(0_0%_100%/0.03)_inset]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Small uppercase section header with an accent icon. */
export function CardHeader({
  title,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon size={13} className="text-accent" strokeWidth={2.4} />
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </span>
    </div>
  );
}

/** Label/value row used inside cards. */
export function DetailRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="w-20 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <span className="flex-1 text-sm text-foreground">{value}</span>
    </div>
  );
}
