import {
  ChevronLeft,
  Clock,
  Coffee,
  Leaf,
  Pencil,
  Ruler,
  Text as TextIcon,
  Trash2,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardHeader, DetailRow } from "@/components/Card";
import {
  MouthfeelBadges,
  RatingDots,
  StrengthBolts,
  strengthLabel,
} from "@/components/Ratings";
import { useCigars } from "@/store/useCigars";
import { ThirdNotes, thirdHasContent } from "@/types/cigar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const EntryDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { getById, remove } = useCigars();
  
  const [confirmDelete, setConfirmDelete] = useState(false);

  // 1. Try to load from personal local store first
  const localEntry = id ? getById(id) : undefined;

  // 2. Fallback DB states for public community journals
  const [dbEntry, setDbEntry] = useState<any>(null);
  const [isLoadingDB, setIsLoadingDB] = useState(!localEntry);

  useEffect(() => {
    async function fetchPublicEntry() {
      // If we already have it locally, skip the database call
      if (localEntry || !id) {
        setIsLoadingDB(false);
        return;
      }
      try {
        // OVERRIDE: Using 'as any' bypasses the local strict types so it safely fetches the cigars table
        const { data, error } = await (supabase as any)
          .from("cigars")
          .select("*")
          .eq("id", id)
          .single();

        if (error) throw error;
        
        const dbData: any = data; // Force data to be flexible to clear property errors
        
        // Map Supabase snake_case columns back to local camelCase structure
        setDbEntry({
          id: dbData.id,
          cigarName: dbData.cigar_name || dbData.name,
          brand: dbData.brand,
          vitola: dbData.vitola,
          length: dbData.length,
          ringGauge: dbData.ring_gauge,
          wrapper: dbData.wrapper,
          binder: dbData.binder,
          filler: dbData.filler,
          rating: dbData.rating,
          strength: dbData.strength,
          humidity: dbData.humidity,
          timestamp: dbData.timestamp || dbData.created_at,
          location: dbData.location,
          pairedWith: dbData.paired_with,
          durationMinutes: dbData.duration_minutes,
          photos: dbData.photos || [],
          firstThird: dbData.first_third || { notes: "", mouthfeel: [], complexity: 0, flavour: 0, harmony: 0 },
          secondThird: dbData.second_third || { notes: "", mouthfeel: [], complexity: 0, flavour: 0, harmony: 0 },
          finalThird: dbData.final_third || { notes: "", mouthfeel: [], complexity: 0, flavour: 0, harmony: 0 },
          user_id: dbData.user_id,
        });
      } catch (err) {
        console.error("Failed to load public entry:", err);
      } finally {
        setIsLoadingDB(false);
      }
    }
    fetchPublicEntry();
  }, [id, localEntry]);

  // Combine results and determine ownership privileges
  const entry = localEntry || dbEntry;
  const isOwner = localEntry ? true : (user && dbEntry?.user_id === user.id);

  if (isLoadingDB) {
    return (
      <div className="flex min-h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  if (!entry) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-muted-foreground">This entry no longer exists.</p>
        <button
          onClick={() => navigate("/")}
          className="rounded-full bg-accent px-5 py-2.5 font-semibold text-accent-foreground"
        >
          Back to Humidor
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    remove(entry.id);
    navigate("/");
  };

  const hasConstruction =
    entry.wrapper || entry.binder || entry.filler ? true : false;
  const thirds: { title: string; numeral: string; data: ThirdNotes }[] = [
    { title: "First Third", numeral: "1", data: entry.firstThird },
    { title: "Second Third", numeral: "2", data: entry.secondThird },
    { title: "Final Third", numeral: "3", data: entry.finalThird },
  ].filter((t) => thirdHasContent(t.data));

  return (
    <div className="relative min-h-full pb-12">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="safe-top mx-auto flex w-full max-w-lg items-center justify-between px-3 py-2.5">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-0.5 rounded-full py-1.5 pl-1 pr-3 text-accent transition active:scale-95"
          >
            <ChevronLeft size={22} />
            <span className="text-[15px] font-medium">Back</span>
          </button>
          
          {/* ONLY show Edit button if the user actually owns this journal */}
          {isOwner && (
            <button
              onClick={() => navigate(`/edit/${entry.id}`)}
              className="rounded-full px-3 py-1.5 text-[15px] font-semibold text-accent transition active:scale-95"
            >
              <span className="flex items-center gap-1.5">
                <Pencil size={15} />
                Edit
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="ember-glow pointer-events-none absolute inset-x-0 top-0 h-56" />

      <div className="relative mx-auto w-full max-w-lg space-y-5 px-4 pt-4">
        {/* Hero */}
        <section className="animate-fade-up flex flex-col items-center">
          {entry.photos.length > 0 && (
            <div
              className={
                entry.photos.length === 1
                  ? "mb-4 w-full"
                  : "mb-4 w-full overflow-x-auto scrollbar-hide"
              }
            >
              <div
                className={
                  entry.photos.length === 1
                    ? ""
                    : "flex snap-x snap-mandatory gap-2"
                }
              >
                {entry.photos.map((p: string, i: number) => (
                  <img
                    key={i}
                    src={p}
                    alt={`${entry.cigarName} ${i + 1}`}
                    className={
                      entry.photos.length === 1
                        ? "h-52 w-full rounded-2xl border border-border object-cover"
                        : "h-52 w-64 shrink-0 snap-center rounded-2xl border border-border object-cover"
                    }
                  />
                ))}
              </div>
            </div>
          )}
          <h1 className="text-center text-[26px] font-bold leading-tight text-foreground">
            {entry.cigarName || "Untitled Cigar"}
          </h1>
          {entry.brand && (
            <p className="mt-1 text-lg font-medium text-accent">{entry.brand}</p>
          )}
          {entry.vitola && (
            <p className="text-sm text-muted-foreground">{entry.vitola}</p>
          )}
          {(entry.length || entry.ringGauge) && (
            <div className="mt-3 flex items-center gap-5 text-xs text-muted-foreground">
              {entry.length && (
                <span className="flex items-center gap-1.5">
                  <Ruler size={13} />
                  {entry.length}
                </span>
              )}
              {entry.ringGauge && (
                <span className="flex items-center gap-1.5">
                  <span className="text-[13px]">○</span>
                  Ring {entry.ringGauge}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Rating & strength */}
        <Card className="animate-fade-up">
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center gap-1">
              <div className="flex items-baseline">
                <span className="text-[28px] font-bold tabular-nums text-accent">
                  {entry.rating > 0 ? Number(entry.rating).toFixed(1) : "—"}
                </span>
                <span className="text-base font-medium text-muted-foreground">
                  /10
                </span>
              </div>
              <span className="text-xs text-muted-foreground">Rating</span>
            </div>

            <div className="h-12 w-px bg-border" />

            <div className="flex flex-col items-center gap-1.5">
              <StrengthBolts strength={entry.strength} />
              <span className="text-xs text-muted-foreground">
                Strength · {strengthLabel(entry.strength)}
              </span>
            </div>
          </div>
        </Card>

        {/* Construction */}
        {(hasConstruction || entry.humidity) && (
          <Card className="animate-fade-up">
            <CardHeader title="Construction" icon={Leaf} />
            <div className="mt-3 space-y-3">
              {entry.wrapper && (
                <DetailRow label="Wrapper" value={entry.wrapper} />
              )}
              {entry.wrapper && (entry.binder || entry.filler || entry.humidity) && (
                <div className="h-px bg-border/60" />
              )}
              {entry.binder && <DetailRow label="Binder" value={entry.binder} />}
              {entry.binder && (entry.filler || entry.humidity) && (
                <div className="h-px bg-border/60" />
              )}
              {entry.filler && <DetailRow label="Filler" value={entry.filler} />}
              {entry.filler && entry.humidity && (
                <div className="h-px bg-border/60" />
              )}
              {entry.humidity && <DetailRow label="Humidity" value={entry.humidity} />}
            </div>
          </Card>
        )}

        {/* Tasting journal */}
        {thirds.length > 0 && (
          <Card className="animate-fade-up">
            <CardHeader title="Tasting Journal" icon={TextIcon} />
            <div className="mt-4 space-y-5">
              {thirds.map((t, i) => (
                <div key={t.title}>
                  {i > 0 && <div className="mb-5 h-px bg-border/60" />}
                  <ThirdSection title={t.title} numeral={t.numeral} data={t.data} />
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Session */}
        <Card className="animate-fade-up">
          <CardHeader title="Session" icon={Clock} />
          <div className="mt-3 space-y-3">
            <DetailRow
              label="Date"
              value={new Date(entry.timestamp).toLocaleString(undefined, {
                dateStyle: "long",
                timeStyle: "short",
              })}
            />
            {entry.location && (
              <>
                <div className="h-px bg-border/60" />
                <DetailRow label="Location" value={entry.location} />
              </>
            )}
            {entry.pairedWith && (
              <>
                <div className="h-px bg-border/60" />
                <DetailRow
                  label="Paired with"
                  value={
                    <span className="flex items-center gap-1.5">
                      <Coffee size={13} className="text-muted-foreground" />
                      {entry.pairedWith}
                    </span>
                  }
                />
              </>
            )}
            {entry.durationMinutes > 0 && (
              <>
                <div className="h-px bg-border/60" />
                <DetailRow
                  label="Duration"
                  value={`${entry.durationMinutes} min`}
                />
              </>
            )}
          </div>
        </Card>

        {/* Delete — ONLY visible to the owner of the journal */}
        {isOwner && (
          <div className="pt-2">
            {confirmDelete ? (
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-xl border border-border bg-card py-3.5 text-sm font-medium text-foreground transition active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 rounded-xl bg-destructive py-3.5 text-sm font-semibold text-destructive-foreground transition active:scale-[0.98]"
                >
                  Delete forever
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 py-3.5 text-sm font-medium text-destructive transition active:scale-[0.98]"
              >
                <Trash2 size={16} />
                Delete Entry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function ThirdSection({
  title,
  numeral,
  data,
}: {
  title: string;
  numeral: string;
  data: ThirdNotes;
}) {
  const hasMouthfeel = data.mouthfeel.length > 0;
  const hasRatings =
    data.complexity > 0 ||
    data.flavour > 0 ||
    data.harmony > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
          {numeral}
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>

      {data.notes && (
        <p className="text-sm leading-relaxed text-foreground/75">{data.notes}</p>
      )}

      {hasMouthfeel && (
        <div className="space-y-1">
          <span className="text-[11px] font-medium text-muted-foreground/60">
            Mouthfeel
          </span>
          <MouthfeelBadges mouthfeel={data.mouthfeel} />
        </div>
      )}

      {hasRatings && (
        <div className="space-y-2 pt-0.5">
          {data.complexity > 0 && (
            <SubRating
              label="Complexity"
              rating={data.complexity}
              leftLabel="Simple"
              rightLabel="Complex"
            />
          )}
          {data.flavour > 0 && (
            <SubRating
              label="Flavour"
              rating={data.flavour}
              leftLabel="Bland"
              rightLabel="Rich"
            />
          )}
          {data.harmony > 0 && (
            <SubRating
              label="Harmony"
              rating={data.harmony}
              leftLabel="Uneven"
              rightLabel="Balanced"
            />
          )}
        </div>
      )}
    </div>
  );
}

function SubRating({
  label,
  rating,
  leftLabel,
  rightLabel,
}: {
  label: string;
  rating: number;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="flex items-center">
      <span className="w-24 shrink-0 text-xs text-muted-foreground">{label}</span>
      <RatingDots
        rating={rating}
        leftLabel={leftLabel}
        rightLabel={rightLabel}
      />
    </div>
  );
}

export default EntryDetail;