import { Plus, Search, X, LogOut, User as UserIcon } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { EntryCard } from "@/components/EntryCard";
import { SignInContext } from "@/components/TabLayout";
import { useAuth } from "@/hooks/useAuth";
import { useCigars } from "@/store/useCigars";

const Journal = () => {
  const { entries } = useCigars();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const openSignIn = useContext(SignInContext);
  const { user, isLoading, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter(
      (e) =>
        e.cigarName.toLowerCase().includes(q) ||
        e.brand.toLowerCase().includes(q) ||
        e.vitola.toLowerCase().includes(q) ||
        e.wrapper.toLowerCase().includes(q),
    );
  }, [entries, query]);

  const thisMonthCount = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return entries.filter((e) => new Date(e.timestamp) >= monthStart).length;
  }, [entries]);

  return (
    <div className="relative min-h-full">
      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-64" />

      <div className="relative mx-auto w-full max-w-lg px-4">
        {/* Header - Fixed to support iPhone Notch / Dynamic Island */}
        <header className="flex items-end justify-between pb-4 pt-[calc(2rem+env(safe-area-inset-top,16px))]">
          <div>
            <h1 className="text-[28px] font-bold leading-tight tracking-tight text-foreground">
              Cigar Journal
            </h1>
          </div>

          {/* Google Avatar — inline with heading */}
          <div className="relative -mb-1">
            {isLoading ? (
              <div className="h-10 w-10 rounded-full bg-card animate-pulse" />
            ) : (
              <>
                <button
                  onClick={() => {
                    if (!user) {
                      openSignIn?.();
                    } else {
                      setShowDropdown((prev) => !prev);
                    }
                  }}
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-card shadow-lg transition-transform active:scale-95"
                  aria-label={user ? "Account menu" : "Sign in"}
                >
                  {user?.picture ? (
                    <img
                      src={user.picture}
                      alt={user.name ?? "Profile"}
                      className="h-full w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <UserIcon size={18} className="text-muted-foreground" />
                  )}
                </button>

                {/* Dropdown */}
                {showDropdown && user && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDropdown(false)}
                    />
                    <div className="animate-scale-in absolute right-0 top-12 z-20 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-xl">
                      <div className="border-b border-border px-3 py-2.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {user.name ?? "Signed in"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          signOut();
                          setShowDropdown(false);
                        }}
                        className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-card hover:text-destructive"
                      >
                        <LogOut size={15} />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </header>

        {/* Search */}
        <div className="relative mb-5">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your cigars..."
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-accent/50"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Stats */}
        {entries.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <StatTile label="Cigars Smoked" value={String(entries.length)} />
            <StatTile
              label="This Month"
              value={String(thisMonthCount)}
              accent
            />
          </div>
        )}

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            onAdd={() => navigate("/add")}
            isSearch={query.length > 0}
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((entry, i) => (
              <EntryCard key={entry.id} entry={entry} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* FAB — Fixed positioning with dynamic math to clear your new TabBar layout perfectly */}
      <button
        onClick={() => navigate("/add")}
        className="fixed right-5 bottom-[calc(4.75rem+env(safe-area-inset-bottom,16px))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_6px_24px_-4px_hsl(28_64%_56%/0.7)] transition-transform active:scale-95"
        aria-label="Log a cigar"
      >
        <Plus size={24} strokeWidth={2.8} />
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

function EmptyState({
  onAdd,
  isSearch,
}: {
  onAdd: () => void;
  isSearch: boolean;
}) {
  if (isSearch) {
    return (
      <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
        <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
          <Search size={32} className="text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">No matches</h2>
        <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
          No cigars match your search. Try a different name, brand, or vitola.
        </p>
      </div>
    );
  }

  return (
    <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
      <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
        <svg
          width="72"
          height="48"
          viewBox="0 0 96 64"
          fill="none"
        >
          {/* Toro Maduro body — dark oily wrapper */}
          <defs>
            <linearGradient id="maduroBody" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a2c17" />
              <stop offset="25%" stopColor="#3b2210" />
              <stop offset="50%" stopColor="#2e1a0c" />
              <stop offset="75%" stopColor="#3b2210" />
              <stop offset="100%" stopColor="#4a2c17" />
            </linearGradient>
            <linearGradient id="maduroSheen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff" stopOpacity="0.08" />
              <stop offset="50%" stopColor="#fff" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="maduroCap" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0%" stopColor="#3b2210" />
              <stop offset="40%" stopColor="#2e1a0c" />
              <stop offset="100%" stopColor="#1f1107" />
            </linearGradient>
          </defs>

          {/* Main body — long toro shape (8:1 ratio) */}
          <rect
            x="8"
            y="24"
            width="80"
            height="16"
            rx="8"
            fill="url(#maduroBody)"
          />
          {/* Sheen overlay */}
          <rect
            x="8"
            y="24"
            width="80"
            height="16"
            rx="8"
            fill="url(#maduroSheen)"
          />

          {/* Rounded head (cap) — left side */}
          <ellipse cx="8" cy="32" rx="4" ry="8" fill="url(#maduroCap)" />
          {/* Cap highlight */}
          <ellipse cx="7" cy="29" rx="2" ry="4" fill="#5a3820" opacity="0.5" />

          {/* Foot — right side, slightly lighter where cut */}
          <ellipse cx="88" cy="32" rx="3" ry="8" fill="#2e1a0c" />
          <ellipse cx="88" cy="32" rx="2.5" ry="6.5" fill="#3b2515" />
          <ellipse cx="88" cy="32" rx="1.5" ry="4" fill="#4d3020" opacity="0.6" />

          {/* Cigar band — gold + deep red */}
          <rect x="30" y="26" width="18" height="12" rx="1" fill="#c9a84c" />
          <rect x="31" y="27" width="16" height="10" rx="1" fill="#8b1a1a" />
          <rect x="32" y="28.5" width="14" height="7" rx="0.5" fill="#a67c28" opacity="0.5" />
          {/* Band ornament */}
          <line x1="34" y1="29" x2="44" y2="29" stroke="#e8d48b" strokeWidth="0.7" opacity="0.8" />
          <line x1="34" y1="35" x2="44" y2="35" stroke="#e8d48b" strokeWidth="0.7" opacity="0.8" />

          {/* Wrapper lines for texture */}
          <line x1="13" y1="27" x2="27" y2="27" stroke="#1f1107" strokeWidth="0.5" opacity="0.4" />
          <line x1="13" y1="30" x2="27" y2="30" stroke="#1f1107" strokeWidth="0.5" opacity="0.3" />
          <line x1="13" y1="33" x2="27" y2="33" stroke="#1f1107" strokeWidth="0.5" opacity="0.4" />
          <line x1="13" y1="36" x2="27" y2="36" stroke="#1f1107" strokeWidth="0.5" opacity="0.3" />
          <line x1="50" y1="27" x2="83" y2="27" stroke="#1f1107" strokeWidth="0.5" opacity="0.4" />
          <line x1="50" y1="30" x2="83" y2="30" stroke="#1f1107" strokeWidth="0.5" opacity="0.3" />
          <line x1="50" y1="33" x2="83" y2="33" stroke="#1f1107" strokeWidth="0.5" opacity="0.4" />
          <line x1="50" y1="36" x2="83" y2="36" stroke="#1f1107" strokeWidth="0.5" opacity="0.3" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground">No cigars smoked yet</h2>
      <p className="mt-1 max-w-[260px] text-sm text-muted-foreground">
        Light one up and log your first tasting. Track the flavours of every
        third.
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

export default Journal;