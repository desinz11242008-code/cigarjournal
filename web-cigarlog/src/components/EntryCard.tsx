import { Clock, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { StrengthBolts } from "@/components/Ratings";
import { CigarEntry } from "@/types/cigar";

/** A tappable summary card for a single logged cigar. */
export function EntryCard({ entry, index }: { entry: CigarEntry; index: number }) {
  const navigate = useNavigate();
  const date = new Date(entry.timestamp);

  return (
    <button
      onClick={() => navigate(`/entry/${entry.id}`)}
      className="animate-fade-up group w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-all duration-200 active:scale-[0.985] hover:border-accent/40"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div className="flex">
        <div className="relative h-[112px] w-[104px] shrink-0 overflow-hidden bg-[hsl(var(--field))]">
          {entry.photos.length > 0 ? (
            <img
              src={entry.photos[0]}
              alt={entry.cigarName}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <div className="ember-glow flex h-12 w-12 items-center justify-center rounded-full">
                <span className="text-2xl">🚬</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate text-[15px] font-semibold text-foreground">
                {entry.cigarName || "Untitled Cigar"}
              </h3>
              {entry.rating > 0 && (
                <div className="flex shrink-0 items-baseline gap-0.5 rounded-full bg-accent/15 px-2 py-0.5">
                  <span className="text-sm font-bold text-accent">
                    {entry.rating.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-medium text-accent/70">
                    /10
                  </span>
                </div>
              )}
            </div>
            {entry.brand && (
              <p className="truncate text-[13px] text-accent/90">{entry.brand}</p>
            )}
            {entry.vitola && (
              <p className="truncate text-xs text-muted-foreground">
                {entry.vitola}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            <StrengthBolts strength={entry.strength} size={13} />
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              {entry.location ? (
                <span className="flex items-center gap-1 truncate">
                  <MapPin size={11} />
                  <span className="max-w-[70px] truncate">{entry.location}</span>
                </span>
              ) : null}
              <span className="flex items-center gap-1">
                <Clock size={11} />
                {date.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
