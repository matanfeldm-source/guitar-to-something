export type ScoreRow = { label: string; line: string };

export type ScoreSystem = {
  measureStart: number;
  measureEnd: number;
  bowLine?: string;
  rows: ScoreRow[];
};

/** One harmonic region with a suggested voicing on the target instrument. */
export type ChordChange = {
  measureFrom: number;
  measureTo: number;
  symbol: string;
  guitarOrigin?: string;
  voicing: string;
  /** Optional 4-line ASCII snippet (frets per string). */
  tabMini?: string;
};

export type ArrangementResult = {
  key: string;
  timeSignature: string;
  tempo: string;
  techniques: string[];
  arrangementNotes: string;
  playingTips: string[];
  systems: ScoreSystem[];
  plainTextScore?: string;
  /** Short summary: inferred key, capo, guitar assumptions. */
  harmonyOverview: string;
  /** Chord timeline with voicings for the target instrument. */
  chordChanges: ChordChange[];
  /** What matched the source vs. what was adapted (octave, omitted bass, etc.). */
  fidelityNotes: string[];
};

export type OcrResult = {
  extractedNotation: string;
  notesForPlayer?: string;
  noMusicFound?: boolean;
};

function stripCodeFences(text: string): string {
  let s = text.trim();
  const fence = /^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/im.exec(s);
  if (fence) return fence[1].trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return s.trim();
}

/** Find balanced JSON object starting at first `{`. */
export function extractJsonObject(raw: string): string {
  const s = stripCodeFences(raw);
  const start = s.indexOf("{");
  if (start === -1) throw new Error("No JSON object start found in model output.");

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const ch = s[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\" && inString) {
      escape = true;
      continue;
    }
    if (ch === '"' && !escape) {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }

  throw new Error("JSON object appears truncated or unclosed.");
}

export function parseJsonSafe(
  raw: string,
):
  | { ok: true; value: unknown }
  | { ok: false; error: string; truncated: boolean } {
  try {
    const jsonStr = extractJsonObject(raw);
    return { ok: true, value: JSON.parse(jsonStr) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: msg,
      truncated: /truncated|unclosed/i.test(msg),
    };
  }
}

/** Pad every row line (and bow line) in each system to the same width for clean columns. */
export function normalizeSystems(systems: ScoreSystem[]): ScoreSystem[] {
  return systems.map((sys) => {
    const lines = sys.rows.map((r) => r.line ?? "");
    const bow = sys.bowLine;
    const lengths = [...lines, bow ?? ""].map((x) => x.length);
    const max = Math.max(0, ...lengths);
    return {
      ...sys,
      bowLine: bow !== undefined ? bow.padEnd(max, " ") : undefined,
      rows: sys.rows.map((r) => ({
        ...r,
        line: (r.line ?? "").padEnd(max, " "),
      })),
    };
  });
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string");
}

function coerceChordChanges(raw: unknown): ChordChange[] {
  if (!Array.isArray(raw)) return [];
  const out: ChordChange[] = [];
  for (const item of raw) {
    if (!isRecord(item)) continue;
    const sym =
      typeof item.symbol === "string"
        ? item.symbol
        : typeof item.chord === "string"
          ? item.chord
          : "";
    if (!sym.trim()) continue;
    const measureFrom =
      typeof item.measureFrom === "number"
        ? item.measureFrom
        : typeof item.measure_from === "number"
          ? item.measure_from
          : 1;
    const measureTo =
      typeof item.measureTo === "number"
        ? item.measureTo
        : typeof item.measure_to === "number"
          ? item.measure_to
          : measureFrom;
    const voicing = typeof item.voicing === "string" ? item.voicing : "";
    const guitarOrigin =
      typeof item.guitarOrigin === "string"
        ? item.guitarOrigin
        : typeof item.guitar_origin === "string"
          ? item.guitar_origin
          : undefined;
    const tabMini =
      typeof item.tabMini === "string"
        ? item.tabMini
        : typeof item.tab_mini === "string"
          ? item.tab_mini
          : undefined;
    out.push({
      measureFrom,
      measureTo,
      symbol: sym.trim(),
      guitarOrigin,
      voicing,
      tabMini,
    });
  }
  return out;
}

function coerceFidelityNotes(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(/\n+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

export function coerceArrangement(v: unknown): ArrangementResult | null {
  if (!isRecord(v)) return null;
  const systemsRaw = v.systems;
  if (!Array.isArray(systemsRaw)) return null;

  const systems: ScoreSystem[] = systemsRaw.map((s, idx) => {
    if (!isRecord(s)) {
      return {
        measureStart: idx + 1,
        measureEnd: idx + 1,
        rows: [],
      };
    }
    const ms = typeof s.measureStart === "number" ? s.measureStart : idx + 1;
    const me = typeof s.measureEnd === "number" ? s.measureEnd : ms;
    const bowLine = typeof s.bowLine === "string" ? s.bowLine : undefined;
    const rowsRaw = s.rows;
    const rows: ScoreRow[] = Array.isArray(rowsRaw)
      ? rowsRaw
          .map((r) => {
            if (!isRecord(r)) return null;
            const label = typeof r.label === "string" ? r.label : "?";
            const line = typeof r.line === "string" ? r.line : "";
            return { label, line };
          })
          .filter((x): x is ScoreRow => x !== null)
      : [];
    return { measureStart: ms, measureEnd: me, bowLine, rows };
  });

  const normalized = normalizeSystems(systems);
  const hasRows = normalized.some(
    (sys) => sys.rows.length > 0 && sys.rows.some((r) => r.line.trim().length > 0),
  );
  if (!hasRows) return null;

  return {
    key: typeof v.key === "string" ? v.key : "—",
    timeSignature: typeof v.timeSignature === "string" ? v.timeSignature : "—",
    tempo: typeof v.tempo === "string" ? v.tempo : "—",
    techniques: asStringArray(v.techniques),
    arrangementNotes: typeof v.arrangementNotes === "string" ? v.arrangementNotes : "",
    playingTips: asStringArray(v.playingTips),
    systems: normalized,
    plainTextScore: typeof v.plainTextScore === "string" ? v.plainTextScore : undefined,
    harmonyOverview:
      typeof v.harmonyOverview === "string"
        ? v.harmonyOverview
        : typeof v.harmony_overview === "string"
          ? v.harmony_overview
          : "",
    chordChanges: coerceChordChanges(v.chordChanges ?? v.chord_changes),
    fidelityNotes: coerceFidelityNotes(v.fidelityNotes ?? v.fidelity_notes),
  };
}

export function coerceOcr(v: unknown): OcrResult | null {
  if (!isRecord(v)) return null;
  const extracted =
    typeof v.extractedNotation === "string"
      ? v.extractedNotation
      : typeof v.extractednotation === "string"
        ? v.extractednotation
        : "";
  const noMusic = v.noMusicFound === true || v.no_music_found === true;
  if (!noMusic && extracted.trim() === "") return null;
  return {
    extractedNotation: extracted,
    notesForPlayer: typeof v.notesForPlayer === "string" ? v.notesForPlayer : undefined,
    noMusicFound: noMusic,
  };
}
