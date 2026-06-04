import { useCallback, useRef, type ReactNode } from "react";

import { strengthColor, strengthLabel } from "@/components/Ratings";
import { MOUTHFEEL_OPTIONS, type MouthfeelOption } from "@/types/cigar";

/** Labeled text input styled for the dark tobacco theme. */
export function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "decimal";
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
        className="w-full rounded-xl border border-border bg-[hsl(var(--field))] px-3.5 py-3 text-[15px] text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-accent"
      />
    </label>
  );
}

export function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-xl border border-border bg-[hsl(var(--field))] px-3.5 py-3 text-[15px] leading-relaxed text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-accent"
      />
    </label>
  );
}

export function FieldGroup({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <span className="block text-xs font-medium text-muted-foreground">
          {label}
        </span>
      )}
      {children}
    </div>
  );
}

/** Draggable 5-stop strength slider: Mild → Mild-Medium → Medium → Medium-Full → Full. */
export function StrengthSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const stops = [1, 2, 3, 4, 5] as const;

  const snapToStop = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const raw = fraction * (stops.length - 1) + 1;
      const snapped = Math.round(raw);
      onChange(Math.max(1, Math.min(5, snapped)));
    },
    [onChange, stops.length],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      dragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      snapToStop(e.clientX);
    },
    [snapToStop],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      snapToStop(e.clientX);
    },
    [snapToStop],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const thumbPct = value > 0 ? ((value - 1) / 4) * 100 : -10;

  return (
    <div className="space-y-3">
      {/* Track */}
      <div
        ref={trackRef}
        className="relative h-10 cursor-pointer touch-none select-none"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Colored segments */}
        <div className="absolute inset-x-0 top-1/2 flex h-3 -translate-y-1/2 overflow-hidden rounded-full">
          {stops.map((level) => (
            <div
              key={level}
              className="flex-1 transition"
              style={{ backgroundColor: strengthColor(level) }}
            />
          ))}
        </div>
        {/* Thumb */}
        <div
          className="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[2.5px] border-white shadow-[0_2px_8px_rgba(0,0,0,0.4),0_0_0_4px_rgba(214,139,68,0.15)] transition-all duration-150 ease-out"
          style={{
            left: `${thumbPct}%`,
            backgroundColor: value > 0 ? strengthColor(value) : "transparent",
            opacity: value > 0 ? 1 : 0,
          }}
        />
      </div>

      {/* Labels */}
      <div className="flex justify-between">
        {stops.map((level) => {
          const active = level === value;
          const color = strengthColor(level);
          return (
            <button
              key={level}
              type="button"
              onClick={() => onChange(value === level ? 0 : level)}
              className="text-[11px] font-semibold transition active:scale-95"
              style={{
                color: active ? color : "hsl(240 2% 60% / 0.5)",
              }}
            >
              {strengthLabel(level)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Multi-select chip picker for mouthfeel characteristics. */
export function MouthfeelChips({
  selected,
  onChange,
}: {
  selected: MouthfeelOption[];
  onChange: (v: MouthfeelOption[]) => void;
}) {
  const toggle = (opt: MouthfeelOption) => {
    if (selected.includes(opt)) {
      onChange(selected.filter((s) => s !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {MOUTHFEEL_OPTIONS.map((opt) => {
        const on = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => toggle(opt)}
            className="rounded-full border px-3 py-1.5 text-xs font-medium transition active:scale-95"
            style={{
              backgroundColor: on ? "hsl(var(--accent))" : "hsl(var(--field))",
              borderColor: on ? "hsl(var(--accent))" : "hsl(var(--border))",
              color: on ? "hsl(var(--accent-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Tappable 0-5 dot rating with optional left/right labels. */
export function DotPicker({
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      {leftLabel && (
        <span className="text-xs font-medium text-muted-foreground/60 w-10 text-right leading-tight">
          {leftLabel}
        </span>
      )}
      {[1, 2, 3, 4, 5].map((level) => {
        const on = level <= value;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(value === level ? level - 1 : level)}
            className="transition-transform active:scale-90"
          >
            <span
              className="block h-4 w-4 rounded-full border-2"
              style={{
                backgroundColor: on ? "hsl(var(--accent))" : "transparent",
                borderColor: on ? "hsl(var(--accent))" : "hsl(var(--border))",
              }}
            />
          </button>
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
