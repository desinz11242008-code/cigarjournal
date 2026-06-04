import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CigarEntry, MOUTHFEEL_OPTIONS, emptyThird } from "@/types/cigar";

const STORAGE_KEY = "cigarlog.entries.v2";

/** Migrate old entries: mouthfeel number→array, add pairedWith. */
const migrateEntry = (raw: Record<string, unknown>): CigarEntry => {
  const migrateThird = (t: Record<string, unknown> | undefined) => {
    const third = (t ?? emptyThird()) as Record<string, unknown>;
    // Convert old numeric mouthfeel to array
    if (typeof third.mouthfeel === "number") {
      const num = third.mouthfeel as number;
      const count = Math.min(num, MOUTHFEEL_OPTIONS.length);
      third.mouthfeel = count > 0 ? MOUTHFEEL_OPTIONS.slice(0, count) : [];
    }
    return {
      notes: String(third.notes ?? ""),
      mouthfeel: (Array.isArray(third.mouthfeel) ? third.mouthfeel : []) as string[],
      complexity: Number(third.complexity ?? 0),
      flavour: Number(third.flavour ?? 0),
      harmony: Number(third.harmony ?? 0),
    };
  };

  // Migrate old photoData string to photos array
  const photos: string[] = [];
  if (typeof raw.photoData === "string" && raw.photoData.length > 0) {
    photos.push(raw.photoData);
  }
  if (Array.isArray(raw.photos)) {
    photos.push(...(raw.photos.filter((p): p is string => typeof p === "string" && p.length > 0)));
  }
  // Deduplicate
  const uniquePhotos = [...new Set(photos)];

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    timestamp: String(raw.timestamp ?? new Date().toISOString()),
    cigarName: String(raw.cigarName ?? ""),
    brand: String(raw.brand ?? ""),
    vitola: String(raw.vitola ?? ""),
    length: String(raw.length ?? ""),
    ringGauge: String(raw.ringGauge ?? ""),
    wrapper: String(raw.wrapper ?? ""),
    binder: String(raw.binder ?? ""),
    filler: String(raw.filler ?? ""),
    strength: Number(raw.strength ?? 0),
    rating: Number(raw.rating ?? 0),
    location: String(raw.location ?? ""),
    durationMinutes: Number(raw.durationMinutes ?? 0),
    pairedWith: String(raw.pairedWith ?? ""),
    humidity: String(raw.humidity ?? ""),
    photos: uniquePhotos,
    firstThird: migrateThird(raw.firstThird as Record<string, unknown> | undefined),
    secondThird: migrateThird(raw.secondThird as Record<string, unknown> | undefined),
    finalThird: migrateThird(raw.finalThird as Record<string, unknown> | undefined),
  };
};

const loadEntries = (): CigarEntry[] => {
  try {
    // Try new key first, then fall back to old key for migration
    let raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const oldRaw = localStorage.getItem("cigarlog.entries.v1");
      if (oldRaw) {
        const oldEntries = JSON.parse(oldRaw) as Record<string, unknown>[];
        const migrated = oldEntries.map(migrateEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        localStorage.removeItem("cigarlog.entries.v1");
        return migrated;
      }
      return [];
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>[];
    return parsed.map(migrateEntry);
  } catch (err) {
    console.warn("Failed to load cigar entries", err);
    return [];
  }
};

export const [CigarProvider, useCigars] = createContextHook(() => {
  const [entries, setEntries] = useState<CigarEntry[]>(() => loadEntries());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (err) {
      console.warn("Failed to persist cigar entries", err);
    }
  }, [entries]);

  const upsert = useCallback((entry: CigarEntry) => {
    setEntries((prev) => {
      const exists = prev.some((e) => e.id === entry.id);
      if (exists) {
        return prev.map((e) => (e.id === entry.id ? entry : e));
      }
      return [entry, ...prev];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
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
    () => ({ entries: sorted, upsert, remove, getById }),
    [sorted, upsert, remove, getById],
  );
});
