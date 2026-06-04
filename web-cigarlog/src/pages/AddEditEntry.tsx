import { Camera, Coffee, ImagePlus, Leaf, Text as TextIcon, X } from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Card, CardHeader } from "@/components/Card";
import {
  DotPicker,
  FieldGroup,
  MouthfeelChips,
  StrengthSlider,
  TextArea,
  TextField,
} from "@/components/form/Fields";
import { useCigars } from "@/store/useCigars";
import {
  CigarEntry,
  type MouthfeelOption,
  ThirdNotes,
  createEmptyEntry,
} from "@/types/cigar";

const AddEditEntry = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getById, upsert } = useCigars();

  const existing = id ? getById(id) : undefined;
  const [draft, setDraft] = useState<CigarEntry>(
    () => existing ?? createEmptyEntry(),
  );
  const [ratingText, setRatingText] = useState(
    existing && existing.rating > 0 ? String(existing.rating) : "",
  );
  const [photos, setPhotos] = useState<string[]>(draft.photos);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CigarEntry>(key: K, val: CigarEntry[K]) =>
    setDraft((d) => ({ ...d, [key]: val }));

  const setThird = (
    key: "firstThird" | "secondThird" | "finalThird",
    field: keyof ThirdNotes,
    val: ThirdNotes[keyof ThirdNotes],
  ) => setDraft((d) => ({ ...d, [key]: { ...d[key], [field]: val } }));

  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Copy into a stable array BEFORE resetting the input — resetting
    // the value empties the live FileList, which would otherwise break
    // the async FileReader callbacks below.
    const fileList = Array.from(e.target.files ?? []);
    if (fileRef.current) fileRef.current.value = "";
    if (fileList.length === 0) return;

    const readFile = (file: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });

    Promise.all(fileList.map(readFile))
      .then((results) => {
        setPhotos((prev) => [...prev, ...results]);
      })
      .catch((err) => {
        console.warn("Failed to read photo", err);
      });
  };

  const removePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const save = () => {
    upsert({ ...draft, photos });
    if (existing) {
      navigate(`/entry/${draft.id}`);
    } else {
      navigate("/");
    }
  };

  const parseRating = (raw: string) => {
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    const sanitized = parts[0] + (parts.length > 1 ? "." + parts.slice(1).join("") : "");
    const num = parseFloat(sanitized);
    if (isNaN(num)) return { text: cleaned, value: 0 };
    const clamped = Math.round(Math.min(10, Math.max(1, num)) * 10) / 10;
    return { text: String(clamped), value: clamped };
  };

  const handleRatingChange = (raw: string) => {
    const { text, value } = parseRating(raw);
    setRatingText(text);
    set("rating", value);
  };

  const handleRatingBlur = () => {
    if (draft.rating > 0) {
      setRatingText(String(draft.rating));
    } else {
      setRatingText("");
    }
  };

  const canSave = draft.cigarName.trim().length > 0;

  return (
    <div className="relative min-h-full pb-32">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="safe-top mx-auto flex w-full max-w-lg items-center justify-between px-4 py-2.5">
          <button
            onClick={() => navigate(-1)}
            className="text-[15px] font-medium text-muted-foreground transition active:scale-95"
          >
            Cancel
          </button>
          <span className="text-[15px] font-semibold text-foreground">
            {existing ? "Edit Entry" : "New Entry"}
          </span>
          <button
            onClick={save}
            disabled={!canSave}
            className="text-[15px] font-semibold text-accent transition active:scale-95 disabled:opacity-30"
          >
            Save
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-lg space-y-5 px-4 pt-5">
        {/* Photos */}
        <div>
          {photos.length === 0 ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative flex h-44 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-border bg-[hsl(var(--field))] transition active:scale-[0.99]"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera size={26} />
                <span className="text-sm">Add photos</span>
              </div>
            </button>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className="relative aspect-square overflow-hidden rounded-xl border border-border"
                  >
                    <img
                      src={p}
                      alt={`cigar ${i + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition active:scale-90"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-square items-center justify-center rounded-xl border border-dashed border-border bg-[hsl(var(--field))] transition active:scale-[0.97]"
                >
                  <ImagePlus size={22} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handlePhotos}
          className="hidden"
        />

        {/* Basics */}
        <Card>
          <CardHeader title="The Cigar" icon={Leaf} />
          <div className="mt-4 space-y-4">
            <TextField
              label="Name"
              value={draft.cigarName}
              onChange={(v) => set("cigarName", v)}
              placeholder="e.g. Montecristo No. 2"
            />
            <TextField
              label="Brand"
              value={draft.brand}
              onChange={(v) => set("brand", v)}
              placeholder="e.g. Montecristo"
            />
            <TextField
              label="Vitola"
              value={draft.vitola}
              onChange={(v) => set("vitola", v)}
              placeholder="e.g. Torpedo"
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Length"
                value={draft.length}
                onChange={(v) => set("length", v)}
                placeholder={'e.g. 6.1" / 15.5cm'}
              />
              <TextField
                label="Ring Gauge"
                value={draft.ringGauge}
                onChange={(v) => set("ringGauge", v)}
                placeholder="e.g. 52"
                inputMode="numeric"
              />
            </div>
            <TextField
              label="Humidity"
              value={draft.humidity}
              onChange={(v) => set("humidity", v)}
              placeholder="e.g. 65%"
            />
          </div>
        </Card>

        {/* Rating & strength */}
        <Card>
          <CardHeader title="RATING" icon={TextIcon} />
          <div className="mt-4 space-y-5">
            <FieldGroup label="Rating">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={ratingText}
                  onChange={(e) => handleRatingChange(e.target.value)}
                  onBlur={handleRatingBlur}
                  placeholder=""
                  className="h-12 w-16 rounded-xl border border-border bg-[hsl(var(--field))] text-center text-lg font-bold text-accent outline-none transition focus:border-accent"
                />
                <span className="text-lg font-bold text-muted-foreground">
                  / 10
                </span>
              </div>
            </FieldGroup>

            <FieldGroup label="Strength">
              <StrengthSlider
                value={draft.strength}
                onChange={(v) => set("strength", v)}
              />
            </FieldGroup>
          </div>
        </Card>

        {/* Construction */}
        <Card>
          <CardHeader title="Construction" icon={Leaf} />
          <div className="mt-4 space-y-4">
            <TextField
              label="Wrapper"
              value={draft.wrapper}
              onChange={(v) => set("wrapper", v)}
              placeholder="e.g. Connecticut Shade"
            />
            <TextField
              label="Binder"
              value={draft.binder}
              onChange={(v) => set("binder", v)}
              placeholder="e.g. Dominican"
            />
            <TextField
              label="Filler"
              value={draft.filler}
              onChange={(v) => set("filler", v)}
              placeholder="e.g. Dominican, Nicaraguan"
            />
          </div>
        </Card>

        {/* Tasting journal */}
        <Card>
          <CardHeader title="Tasting Journal" icon={TextIcon} />
          <div className="mt-4 space-y-6">
            <ThirdEditor
              title="First Third"
              numeral="1"
              data={draft.firstThird}
              onChange={(f, v) => setThird("firstThird", f, v)}
            />
            <div className="h-px bg-border/60" />
            <ThirdEditor
              title="Second Third"
              numeral="2"
              data={draft.secondThird}
              onChange={(f, v) => setThird("secondThird", f, v)}
            />
            <div className="h-px bg-border/60" />
            <ThirdEditor
              title="Final Third"
              numeral="3"
              data={draft.finalThird}
              onChange={(f, v) => setThird("finalThird", f, v)}
            />
          </div>
        </Card>

        {/* Session */}
        <Card>
          <CardHeader title="Session" icon={TextIcon} />
          <div className="mt-4 space-y-4">
            <TextField
              label="Location"
              value={draft.location}
              onChange={(v) => set("location", v)}
              placeholder="e.g. Backyard patio"
            />
            <TextField
              label="Paired with"
              value={draft.pairedWith}
              onChange={(v) => set("pairedWith", v)}
              placeholder="e.g. Light roast coffee"
            />
            <TextField
              label="Duration (minutes)"
              value={draft.durationMinutes > 0 ? String(draft.durationMinutes) : ""}
              onChange={(v) =>
                set("durationMinutes", Math.max(0, parseInt(v) || 0))
              }
              placeholder="e.g. 75"
              inputMode="numeric"
            />
          </div>
        </Card>
      </div>
    </div>
  );
};

function ThirdEditor({
  title,
  numeral,
  data,
  onChange,
}: {
  title: string;
  numeral: string;
  data: ThirdNotes;
  onChange: (field: keyof ThirdNotes, val: ThirdNotes[keyof ThirdNotes]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-foreground">
          {numeral}
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>

      <TextArea
        label="Notes"
        value={data.notes}
        onChange={(v) => onChange("notes", v)}
        placeholder="Flavour:
Aroma:
Burn:"
      />

      <div className="space-y-4">
        <FieldGroup label="Mouthfeel">
          <MouthfeelChips
            selected={data.mouthfeel}
            onChange={(v) => onChange("mouthfeel", v as MouthfeelOption[])}
          />
        </FieldGroup>

        <SubPicker
          label="Complexity"
          value={data.complexity}
          onChange={(v) => onChange("complexity", v)}
          leftLabel="Simple"
          rightLabel="Complex"
        />
        <SubPicker
          label="Flavour"
          value={data.flavour}
          onChange={(v) => onChange("flavour", v)}
          leftLabel="Bland"
          rightLabel="Rich"
        />
        <SubPicker
          label="Harmony"
          value={data.harmony}
          onChange={(v) => onChange("harmony", v)}
          leftLabel="Uneven"
          rightLabel="Balanced"
        />
      </div>
    </div>
  );
}

function SubPicker({
  label,
  value,
  onChange,
  leftLabel,
  rightLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  leftLabel?: string;
  rightLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <DotPicker
        value={value}
        onChange={onChange}
        leftLabel={leftLabel}
        rightLabel={rightLabel}
      />
    </div>
  );
}

export default AddEditEntry;
