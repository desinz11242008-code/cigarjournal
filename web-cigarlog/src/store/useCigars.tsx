import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CigarEntry, emptyThird } from "@/types/cigar";

// ─── DATA MAPPING LAYER ──────────────────────────────────────────────────
const mapDbToEntry = (row: any): CigarEntry => {
  return {
    id: row.id,
    timestamp: row.timestamp || row.created_at || new Date().toISOString(),
    cigarName: row.name || row.cigar_name || "",
    brand: row.brand || "",
    vitola: row.vitola || "",
    length: row.length || "",
    ringGauge: row.ring_gauge || row.ringGauge || "",
    wrapper: row.wrapper || "",
    binder: row.binder || "",
    filler: row.filler || "",
    strength: Number(row.strength ?? 0),
    rating: Number(row.rating ?? 0),
    location: row.location || "",
    durationMinutes: Number(row.duration_minutes ?? row.durationMinutes ?? 0),
    pairedWith: row.paired_with ?? row.pairedWith ?? "",
    humidity: row.humidity || "",
    photos: Array.isArray(row.photos) ? row.photos : [],
    firstThird: row.first_third || row.firstThird || emptyThird(),
    secondThird: row.second_third || row.secondThird || emptyThird(),
    finalThird: row.final_third || row.finalThird || emptyThird(),
  };
};

const mapEntryToDb = (entry: CigarEntry, userId: string) => {
  return {
    id: entry.id,
    user_id: userId,
    name: entry.cigarName,
    brand: entry.brand,
    vitola: entry.vitola,
    length: entry.length,
    ring_gauge: entry.ringGauge,
    wrapper: entry.wrapper,
    binder: entry.binder,
    filler: entry.filler,
    strength: entry.strength,
    rating: entry.rating,
    location: entry.location,
    duration_minutes: entry.durationMinutes,
    paired_with: entry.pairedWith,
    humidity: entry.humidity,
    photos: entry.photos,
    first_third: entry.firstThird,
    second_third: entry.secondThird,
    final_third: entry.finalThird,
    timestamp: entry.timestamp,
  };
};

// ─── STATE PROVIDER ──────────────────────────────────────────────────────
export const [CigarProvider, useCigars] = createContextHook(() => {
  const [entries, setEntries] = useState<CigarEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Real-time listener for Auth changes (Login / Logout / Switch User)
  useEffect(() => {
    let authSubscription: any = null;

    const setupAuthListener = async () => {
      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          // A user is logged in -> Load their specific data
          setLoading(true);
          try {
            const { data, error } = await (supabase as any)
              .from("cigars")
              .select("*")
              .eq("user_id", session.user.id) // Hard filter for the active user account
              .order("timestamp", { ascending: false });

            if (error) throw error;
            if (data) {
              setEntries(data.map(mapDbToEntry));
            }
          } catch (err) {
            console.error("Failed to load cloud cigar entries:", err);
          } finally {
            setLoading(false);
          }
        } else {
          // USER LOGGED OUT -> WIPE EVERYTHING IMMEDIATELY
          setEntries([]);
          setLoading(false);
        }
      });

      authSubscription = subscription;
    };

    setupAuthListener();

    // Clean up listener when component unmounts
    return () => {
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  const upsert = useCallback(async (entry: CigarEntry) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEntries((prev) => {
        const exists = prev.some((e) => e.id === entry.id);
        if (exists) {
          return prev.map((e) => (e.id === entry.id ? entry : e));
        }
        return [entry, ...prev];
      });

      const dbRow = mapEntryToDb(entry, user.id);
      const { error } = await (supabase as any).from("cigars").upsert(dbRow);
      
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save cigar entry to database:", err);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setEntries((prev) => prev.filter((e) => e.id !== id));

      const { error } = await (supabase as any)
        .from("cigars")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id); // Guarded delete target
      
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete cigar entry from database:", err);
    }
  }, []);

  const getById = useCallback(
    (id: string): CigarEntry | undefined => entries.find((e) => e.id === id),
    [entries],
  );

  const sorted = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      ),
    [entries],
  );

  return useMemo(
    () => ({ entries: sorted, upsert, remove, getById, loading }),
    [sorted, upsert, remove, getById, loading],
  );
});