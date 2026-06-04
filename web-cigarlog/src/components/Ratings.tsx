import { Zap } from "lucide-react";

import type { MouthfeelOption } from "@/types/cigar";

/** Strength meter shown as colored lightning bolts (1-5). */
export function StrengthBolts({
  strength,
  size = 18,
}: {
  strength: number;
  size?: number;
}) {
  const color = strengthColor(strength);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((level) => (
        <Zap
          key={level}
          size={size}
          strokeWidth={2}
          className="transition-colors"
          style={{
            fill: level <= strength ? color : "transparent",
            color: level <= strength ? color : "hsl(240 2% 60% / 0.3)",
          }}
        />
      ))}
    </div>
  );
}

export function strengthColor(strength: number): string {
  switch (strength) {
    case 1:
      return "#34C759"; // green
    case 2:
      return "#5BD9B1"; // mint
    case 3:
      return "#D68B44"; // accent
    case 4:
      return "#FF9500"; // orange
    case 5:
      return "#FF3B30"; // red
    default:
      return "hsl(240 2% 60%)";
  }
}

export function strengthLabel(strength: number): string {
  return (
    ["Unrated", "Mild", "Mild-Med", "Medium", "Med-Full", "Full"][strength] ??
    "Unrated"
  );
}

/** A row of 5 dots used for sub-ratings (complexity, flavour, harmony). */
export function RatingDots({
  rating,
  leftLabel,
  rightLabel,
}: {
  rating: number;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {leftLabel && (
        <span className="text-xs font-medium text-muted-foreground/60 w-10 text-right leading-tight">
          {leftLabel}
        </span>
      )}
      {[1, 2, 3, 4, 5].map((level) => {
        const on = level <= rating;
        return (
          <span
            key={level}
            className="h-2.5 w-2.5 rounded-full border transition-colors"
            style={{
              backgroundColor: on ? "hsl(var(--accent))" : "hsl(var(--field))",
              borderColor: on ? "hsl(var(--accent))" : "hsl(var(--border))",
            }}
          />
        );
      })}
      {rightLabel && (
        <span className="text-xs font-medium text-muted-foreground/60 w-10 leading-tight">
          {rightLabel}
        </span>
      )}
    </div>
  );
}

/** Small chips showing selected mouthfeel characteristics. */
export function MouthfeelBadges({
  mouthfeel,
}: {
  mouthfeel: MouthfeelOption[];
}) {
  if (mouthfeel.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {mouthfeel.map((m) => (
        <span
          key={m}
          className="rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent"
        >
          {m}
        </span>
      ))}
    </div>
  );
}
