import { Plus, Search, X, LogOut, User as UserIcon } from "lucide-react";
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery } from "@tanstack/react-query";

import { EntryCard } from "@/components/EntryCard";
import { SignInContext } from "@/components/TabLayout";
import { useAuth } from "@/hooks/useAuth";
import { useCigars } from "@/store/useCigars";
import { supabase } from "@/integrations/supabase/client";

const Journal = () => {
  const { entries } = useCigars();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const openSignIn = useContext(SignInContext);
  const { user, isLoading, signOut } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const queryClient = useQueryClient();

  // NEW: Fetch the custom user profile from the database (matches Settings tab)
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user?.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

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

  // Safely extract details, prioritizing the App Profile over the Google Defaults!
  const safeUser = user as any;
  const displayName = profile?.name || safeUser?.user_metadata?.full_name || safeUser?.user_metadata?.name || safeUser?.name || "Collector";
  const displayPicture = profile?.avatar_url || safeUser?.user_metadata?.avatar_url || safeUser?.user_metadata?.picture || safeUser?.avatar_url || safeUser?.picture;

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

          {/* User Profile Block — Username + PFP Inline */}
          <div className="relative -mb-1">
            {isLoading ? (
              <div className="flex items-center gap-2.5">
                <div className="h-4 w-16 bg-card animate-pulse rounded-md" />
                <div className="h-10 w-10 rounded-full bg-card animate-pulse" />
              </div>
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
                  className="relative flex items-center gap-2.5 rounded-full p-1 pr-1.5 transition-all duration-200 hover:bg-muted/40 active:scale-[0.98] group"
                  aria-label={user ? "Account menu" : "Sign in"}
                >
                  {/* Dynamic Username Display */}
                  {user && (
                    <span className="text-[14px] font-semibold text-foreground group-hover:text-accent transition-colors max-w-[110px] truncate">
                      {displayName}
                    </span>
                  )}

                  {/* Profile Picture Frame */}
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-border bg-card shadow-lg">
                    {displayPicture ? (
                      <img
                        src={displayPicture}
                        alt={displayName}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <UserIcon size={18} className="text-muted-foreground" />
                    )}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showDropdown && user && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDropdown(false)}
                    />
                    <div className="animate-scale-in absolute right-0 top-12 z-20 w-48 rounded-xl border border-border bg-popover p-1.5 shadow-xl">
                      <div className="border-b border-border px-3 py-2.5">
                        <p className="text-sm font-medium text-foreground truncate">
                          {displayName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await signOut();
                          queryClient.clear();
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
            placeholder={user ? "Search your cigars..." : "Sign in to look through entries..."}
            disabled={!user}
            className="h-11 w-full rounded-xl border border-border bg-card pl-10 pr-10 text-[15px] text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors focus:border-accent/50 disabled:opacity-50"
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
        {user && entries.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-3">
            <StatTile label="Cigars Smoked" value={String(entries.length)} />
            <StatTile
              label="This Month"
              value={String(thisMonthCount)}
              accent
            />
          </div>
        )}

        {/* Dynamic List Rendering based on Auth state */}
        {!user && !isLoading ? (
          <EmptyState
            onAdd={() => navigate("/add")}
            isSearch={false}
            isLoggedOut={true}
            onSignIn={() => openSignIn?.()}
          />
        ) : filtered.length === 0 ? (
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

      {/* FAB — Only show button if user is authenticated */}
      {user && (
        <button
          onClick={() => navigate("/add")}
          className="fixed right-5 bottom-[calc(4.75rem+env(safe-area-inset-bottom,16px))] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-[0_6px_24px_-4px_hsl(28_64%_56%/0.7)] transition-transform active:scale-95"
          aria-label="Log a cigar"
        >
          <Plus size={24} strokeWidth={2.8} />
        </button>
      )}
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
  isLoggedOut,
  onSignIn,
}: {
  onAdd: () => void;
  isSearch: boolean;
  isLoggedOut?: boolean;
  onSignIn?: () => void;
}) {
  if (isLoggedOut) {
    return (
      <div className="animate-scale-in mt-16 flex flex-col items-center text-center">
        <div className="ember-glow mb-5 flex h-24 w-24 items-center justify-center rounded-full">
          <UserIcon size={32} className="text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Your Personal Journal</h2>
        <p className="mt-1 max-w-[280px] text-sm text-muted-foreground">
          Sign in with your Google account to securely log your cigars, track your stats, and keep your history strictly private.
        </p>
        <button
          onClick={onSignIn}
          className="mt-6 rounded-full bg-accent px-6 py-3 font-semibold text-accent-foreground transition-transform active:scale-95"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

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
      <div className="relative mb-6 flex h-20 w-full items-center justify-center scale-110">
        <div className="absolute h-8 w-28 rounded-full bg-accent/10 blur-xl animate-pulse" />
        
        <div className="relative flex h-4 w-36 items-center overflow-hidden rounded-r-sm bg-gradient-to-b from-[#59361a] via-[#402511] to-[#2c180a] shadow-[0_4px_12px_rgba(0,0,0,0.5)] border-y border-black/30">
          <div className="absolute left-0 h-full w-3 rounded-l bg-gradient-to-r from-black/50 to-transparent" />
          <div className="absolute inset-0 opacity-20 bg-[linear-gradient(65deg,transparent_45%,#000_50%,transparent_55%)] bg-[length:12px_100%]" />
          <div className="absolute left-8 flex h-full w-5 items-center justify-center bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border-x border-yellow-200/30 shadow-md">
            <div className="h-2.5 w-2.5 rounded-full bg-gradient-to-tr from-red-700 to-red-500 border border-yellow-100/50" />
          </div>
          <div className="absolute right-0 h-full w-6 bg-gradient-to-r from-transparent via-[#6b6b6b] to-[#a6a6a6]" />
        </div>
        <div className="absolute right-[calc(50%-73px)] h-3 w-0.5 rounded-r bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_8px_#ea580c] animate-pulse" />
      </div>

      <h2 className="text-lg font-semibold text-foreground">No cigars smoked yet</h2>
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

export default Journal;