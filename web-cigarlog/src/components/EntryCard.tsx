import { MapPin, Send } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { StrengthBolts } from "@/components/Ratings";
import { CigarEntry } from "@/types/cigar";
import { ShareModal } from "@/components/ShareModal";

/** A tappable summary card for a single logged cigar. */
export function EntryCard({ entry, index }: { entry: CigarEntry; index: number }) {
  const navigate = useNavigate();
  const date = new Date(entry.timestamp);
  
  // State to control the Share Modal visibility
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevents navigating to the detail page
    setIsShareModalOpen(true);
  };

  // Callback function triggered when a user successfully shares a post inside ShareModal
  const handleShareSuccess = () => {
    setIsShareModalOpen(false);
    // Smoothly redirect the user directly to the social tab feed to view their shared entry
    navigate("/social");
  };

  return (
    <>
      <button
        onClick={() => navigate(`/entry/${entry.id}`)}
        className="animate-fade-up group w-full overflow-hidden rounded-2xl border border-border bg-card text-left transition-all duration-200 active:scale-[0.985] hover:border-accent/40"
        style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
      >
        <div className="flex h-[130px]">
          <div className="relative h-full w-[110px] shrink-0 overflow-hidden bg-[hsl(var(--field))]">
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

          <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5">
            <div className="min-w-0">
              {/* Top Row: Title & Date */}
              <div className="flex items-start justify-between gap-2">
                <h3 className="truncate text-[15px] font-semibold text-foreground">
                  {entry.cigarName || "Untitled Cigar"}
                </h3>
                <span className="shrink-0 text-[11px] font-medium text-muted-foreground mt-0.5">
                  {date.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>

              {/* Middle Row: Details & Rating */}
              <div className="mt-0.5 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {entry.brand && (
                    <p className="truncate text-[13px] text-accent/90">{entry.brand}</p>
                  )}
                  {entry.vitola && (
                    <p className="truncate text-xs text-muted-foreground mt-0.5">
                      {entry.vitola}
                    </p>
                  )}
                </div>

                {entry.rating > 0 && (
                  <div className="flex shrink-0 items-baseline gap-0.5 rounded-full bg-accent/10 px-2 py-0.5 mt-0.5 border border-accent/20">
                    <span className="text-sm font-bold text-accent">
                      {entry.rating.toFixed(1)}
                    </span>
                    <span className="text-[10px] font-medium text-accent/70">
                      /10
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row: Specs & Share Button */}
            <div className="flex items-end justify-between gap-2 mt-auto pt-2">
              <div className="flex flex-col gap-1.5">
                <StrengthBolts strength={entry.strength} size={12} />
                {entry.location && (
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin size={11} className="shrink-0" />
                    <span className="max-w-[90px] truncate">{entry.location}</span>
                  </span>
                )}
              </div>

              <button
                onClick={handleShareClick}
                className="group/share flex shrink-0 items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-[11px] font-semibold text-accent transition-all hover:bg-accent hover:text-accent-foreground active:scale-95"
              >
                <Send size={12} className="transition-transform group-hover/share:-translate-y-0.5 group-hover/share:translate-x-0.5" />
                Share
              </button>
            </div>
          </div>
        </div>
      </button>

      {/* Passed onShareSuccess down so it can trigger the navigate route change hook */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        onShareSuccess={handleShareSuccess}
        entry={entry} 
      />
    </>
  );
}