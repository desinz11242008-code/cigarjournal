import { Cigarette, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { EntryCard } from "@/components/EntryCard";
import { useCigars } from "@/store/useCigars";

const Home = () => {
  const { entries } = useCigars();
  const navigate = useNavigate();

  const avgRating =
    entries.filter((e) => e.rating > 0).length > 0
      ? entries.reduce((sum, e) => sum + e.rating, 0) /
        entries.filter((e) => e.rating > 0).length
      : 0;

  return (
    <div className="relative min-h-full pb-28">
      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

      <div className="relative mx-auto w-full max-w-lg px-4">
        {/* Header */}
        <header className="safe-top flex items-end justify-between pb-5 pt-8">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent/15">
                <Cigarette size={17} className="text-accent" />
              </span>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Cigar Journal
              </span>
            </div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              Humidor
            </h1>
          </div>
        </header>

        {/* Stats */}
        {entries.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <StatTile label="Entries" value={String(entries.length)} />
            <StatTile
              label="Avg Rating"
              value={avgRating > 0 ? avgRating.toFixed(1) : "—"}
              accent
            />
          </div>
        )}

        {/* List */}
        {entries.length === 0 ? (
          <EmptyState onAdd={() => navigate("/add")} />
        ) : (
          <div className="space-y-3">
            {entries.map((entry, i) => (
              <EntryCard key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* Floating add button */}
      <button
        onClick={() => navigate("/add")}
        className="safe-bottom fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-accent px-6 py-3.5 font-semibold text-accent-foreground shadow-[0_8px_30px_-6px_hsl(28_64%_56%/0.6)] transition-transform active:scale-95"
      >
        <Plus size={20} strokeWidth={2.6} />
        Log Cigar
      </button>
    </div>
  );
};

function StatTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3.5">
      <div
        className={`text-2xl font-bold ${accent ? "text-accent" : "text-foreground"}`}
      >
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
      <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
        <span className="text-5xl">🚬</span>
      </div>
      <h2 className="text-lg font-semibold text-foreground">No entries yet</h2>
      <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
        Light one up and log your first tasting. Track the flavours of every third.
      </p>
      <button
        onClick={onAdd}
        className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform active:scale-95"
      >
        Log your first cigar
      </button>
    </div>
  );
}

export default Home;
