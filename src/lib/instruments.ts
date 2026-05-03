export type InstrumentDef = {
  id: string;
  name: string;
  shortLabel: string;
  tuningDescription: string;
  /** Display order: highest pitch string first (top line of tab). */
  stringLabels: string[];
  stringColors: string[];
  /** Include bow direction hints (↓↑ or v ^) */
  bowing: boolean;
  /** Hint frets that may need shifts / stretches */
  fretAccessibilityHints: boolean;
  rangeHint: string;
  arrangeInstructions: string;
};

export const INSTRUMENTS: Record<string, InstrumentDef> = {
  violin: {
    id: "violin",
    name: "Violin",
    shortLabel: "Vln",
    tuningDescription: "G3–D4–A4–E5 (strings ordered G D A E low→high; tab shows E A D G top→bottom)",
    stringLabels: ["E", "A", "D", "G"],
    stringColors: ["#9b2226", "#bb3e03", "#005f73", "#0a9396"],
    bowing: true,
    fretAccessibilityHints: false,
    rangeHint: "Comfortable range roughly G3–E7 on E string; keep shifts idiomatic.",
    arrangeInstructions:
      "4 string courses in GDAE (same as mandolin). Tab rows MUST be labeled E, A, D, G with E as highest string line at top. Add bowLine with v and ^ (or ↓↑) marking down-bow/up-bow suggestions per beat when possible.",
  },
  viola: {
    id: "viola",
    name: "Viola",
    shortLabel: "Vla",
    tuningDescription: "C3–G3–D4–A4",
    stringLabels: ["A", "D", "G", "C"],
    stringColors: ["#7c3aed", "#0891b2", "#0d9488", "#ca8a04"],
    bowing: true,
    fretAccessibilityHints: false,
    rangeHint: "Range ~C3–A5 depending on positions.",
    arrangeInstructions:
      "Viola is tuned C G D A from low to high. Tab rows top-to-bottom: A, D, G, C (A is highest). Include bowLine like violin when bowing is true.",
  },
  cello: {
    id: "cello",
    name: "Cello",
    shortLabel: "Vc",
    tuningDescription: "C2–G2–D3–A3",
    stringLabels: ["A", "D", "G", "C"],
    stringColors: ["#6d28d9", "#0369a1", "#047857", "#a16207"],
    bowing: true,
    fretAccessibilityHints: false,
    rangeHint: "Written mostly bass/tenor clef; keep tab intuitive for open strings.",
    arrangeInstructions:
      "Cello C G D A low to high. Tab rows top-to-bottom: A, D, G, C. Bow line optional but preferred for classical phrasing.",
  },
  mandolin: {
    id: "mandolin",
    name: "Mandolin",
    shortLabel: "Mnd",
    tuningDescription: "G3–D4–A4–E5 (same intervals as violin)",
    stringLabels: ["E", "A", "D", "G"],
    stringColors: ["#9b2226", "#bb3e03", "#005f73", "#0a9396"],
    bowing: false,
    fretAccessibilityHints: true,
    rangeHint: "Use movable chop chords only when requested; prefer open-friendly positions.",
    arrangeInstructions:
      "Mandolin GDAE. Tab rows E A D G. Note when shifts or stretches may be awkward (fretAccessibility in techniques or tips). Pick direction hints optional (down/upstroke) but not required.",
  },
  ukulele: {
    id: "ukulele",
    name: "Ukulele (reentrant)",
    shortLabel: "Uke",
    tuningDescription: "G4–C4–E4–A4 (high G)",
    stringLabels: ["A", "E", "C", "G"],
    stringColors: ["#c026d3", "#db2777", "#2563eb", "#16a34a"],
    bowing: false,
    fretAccessibilityHints: true,
    rangeHint: "Compact range; mind reentrant high-G when crossing strings.",
    arrangeInstructions:
      "Standard reentrant ukulele: strings low→high are G C E A but tab convention often lists top line as A, then E, C, G. Use rows labeled exactly A, E, C, G top to bottom. Mention reentrant quirks in tips when relevant.",
  },
  baritone_ukulele: {
    id: "baritone_ukulele",
    name: "Baritone ukulele",
    shortLabel: "BarUke",
    tuningDescription: "D3–G3–B3–E4 (linear, like guitar top four)",
    stringLabels: ["E", "B", "G", "D"],
    stringColors: ["#be185d", "#4338ca", "#0f766e", "#b45309"],
    bowing: false,
    fretAccessibilityHints: true,
    rangeHint: "Behaves like guitar without low E and B strings mentally.",
    arrangeInstructions:
      "Baritone uke D G B E low to high. Tab rows top to bottom: E, B, G, D.",
  },
  bass_4: {
    id: "bass_4",
    name: "Bass guitar (4-string)",
    shortLabel: "Bass",
    tuningDescription: "E1–A1–D2–G2 (standard)",
    stringLabels: ["G", "D", "A", "E"],
    stringColors: ["#15803d", "#1d4ed8", "#b91c1c", "#713f12"],
    bowing: false,
    fretAccessibilityHints: true,
    rangeHint: "Keep lines readable; prefer fewer ledger-like ascii clutter.",
    arrangeInstructions:
      "4-string bass E A D G low to high. Tab rows top to bottom: G, D, A, E (G highest pitch on top line).",
  },
  tenor_guitar: {
    id: "tenor_guitar",
    name: "Tenor guitar (CGDA)",
    shortLabel: "TnrGtr",
    tuningDescription: "C3–G3–D4–A4",
    stringLabels: ["A", "D", "G", "C"],
    stringColors: ["#a21caf", "#0e7490", "#047857", "#854d0e"],
    bowing: false,
    fretAccessibilityHints: true,
    rangeHint: "Same string intervals as viola; arranged like guitar technique.",
    arrangeInstructions:
      "Tenor guitar in CGDA tuning (low to high). Tab rows top to bottom: A, D, G, C.",
  },
  bouzouki_gdad: {
    id: "bouzouki_gdad",
    name: "Irish bouzouki (GDAD)",
    shortLabel: "Bouz",
    tuningDescription: "G2–D3–A3–D4 (common Irish)",
    stringLabels: ["D", "A", "D", "G"],
    stringColors: ["#dc2626", "#ea580c", "#ca8a04", "#15803d"],
    bowing: false,
    fretAccessibilityHints: true,
    rangeHint: "Two D courses; label rows clearly so the player knows which D is which.",
    arrangeInstructions:
      "Irish bouzouki GDAD low to high (G D A D). Tab rows top to bottom: high D, A, low D, G — use labels D, A, D, G and in playingTips clarify which D course is high vs low.",
  },
};

export const ARRANGEMENT_STYLES = [
  { id: "melody", name: "Melody-forward", hint: "Carry the tune clearly; light harmony if space." },
  { id: "harmony", name: "Simplified harmony", hint: "Chord tones / double-stops where natural." },
  { id: "arpeggio", name: "Arpeggiated / broken", hint: "Rolling patterns, harp-like figuration." },
  {
    id: "chords",
    name: "Chord-first / comp",
    hint: "Lead with clear chord changes and voicings; melody secondary.",
  },
] as const;

export type ArrangementStyleId = (typeof ARRANGEMENT_STYLES)[number]["id"];
