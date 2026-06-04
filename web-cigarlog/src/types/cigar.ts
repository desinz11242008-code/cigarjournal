/** Mouthfeel characteristics users can select from. */
export const MOUTHFEEL_OPTIONS = [
  "Creamy",
  "Oily",
  "Chewy",
  "Dry",
  "Astringent",
  "Spicy",
  "Zingy",
  "Crisp",
] as const;

export type MouthfeelOption = (typeof MOUTHFEEL_OPTIONS)[number];

/** A single tasting "third" of a cigar session with notes and four sub-ratings (0-5). */
export type ThirdNotes = {
  notes: string;
  mouthfeel: MouthfeelOption[];
  complexity: number;
  flavour: number;
  harmony: number;
};

/** A logged cigar tasting entry. Mirrors the native CigarEntry SwiftData model. */
export type CigarEntry = {
  id: string;
  timestamp: string; // ISO date string

  cigarName: string;
  brand: string;
  vitola: string;
  length: string;
  ringGauge: string;

  wrapper: string;
  binder: string;
  filler: string;

  strength: number; // 0-5
  rating: number; // 0-10

  location: string;
  durationMinutes: number;
  pairedWith: string;

  humidity: string;
  photos: string[]; // base64 data URLs

  firstThird: ThirdNotes;
  secondThird: ThirdNotes;
  finalThird: ThirdNotes;
};

export const emptyThird = (): ThirdNotes => ({
  notes: "",
  mouthfeel: [],
  complexity: 0,
  flavour: 0,
  harmony: 0,
});

export const createEmptyEntry = (): CigarEntry => ({
  id: crypto.randomUUID(),
  timestamp: new Date().toISOString(),
  cigarName: "",
  brand: "",
  vitola: "",
  length: "",
  ringGauge: "",
  wrapper: "",
  binder: "",
  filler: "",
  strength: 0,
  rating: 0,
  location: "",
  durationMinutes: 0,
  pairedWith: "",
  humidity: "",
  photos: [],
  firstThird: emptyThird(),
  secondThird: emptyThird(),
  finalThird: emptyThird(),
});

export const thirdHasContent = (t: ThirdNotes): boolean =>
  t.notes.trim().length > 0 ||
  t.mouthfeel.length > 0 ||
  t.complexity > 0 ||
  t.flavour > 0 ||
  t.harmony > 0;
