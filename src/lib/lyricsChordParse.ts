/**
 * Parse pasted chord charts / lyrics into segments for music mode.
 * Supports: chord-only line above lyric line, [Inline] chords, skips guitar tab staves.
 */

import type { ArrangementResult } from "@/lib/parseResult";

const CHORD_TOKEN =
  /^[A-G][#b]?(?:maj7|maj9|m7|m9|m11|maj|min|dim7|dim|aug|sus4|sus2|add9|add4|sus|m|maj|7|9|11|13|6|5)?(?:\([^)]*\))?(?:\/[A-G][#b]?)?$/;

function isTabLine(line: string): boolean {
  const s = line.trim();
  return /^[eEbBgGdDaA]\s*[|]/.test(s) || /^[eEbBgGdDaA]\s*[-|0-9]/.test(s);
}

function tokenizeChords(line: string): string[] {
  const parts = line.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    const t = p.replace(/[,|]/g, "");
    if (CHORD_TOKEN.test(t)) out.push(t);
  }
  return out;
}

function isChordOnlyLine(line: string): boolean {
  const t = line.trim();
  if (!t || t.startsWith("#") || t.startsWith("//")) return false;
  if (/^\[[^\]]+\]\s*$/.test(t)) return false;
  const tokens = t.split(/\s+/).filter((x) => x.length > 0);
  if (tokens.length === 0) return false;
  let chordish = 0;
  for (const raw of tokens) {
    const x = raw.replace(/[,|]/g, "");
    if (CHORD_TOKEN.test(x)) chordish++;
  }
  return chordish >= tokens.length && chordish > 0;
}

function stripSectionMarkers(line: string): string {
  return line.replace(/^\s*\[[^\]]*:\]\s*/i, "").trim();
}

/** [Am]Hello [C]world → { chords: ["Am","C"], lyric: "Hello world" } */
export function parseInlineChordLine(line: string): {
  chords: string[];
  lyric: string;
} | null {
  const t = line.trim();
  if (!/\[[A-Ga-g][#b]?(?:m|maj|dim|sus|aug|add)?[0-9]*(?:\/[A-Ga-g][#b]?)?\]/.test(t))
    return null;

  const chords: string[] = [];
  let lyric = "";
  const re =
    /\[([A-Ga-g][#b]?(?:m|maj|dim|sus|aug|add)?[0-9]*(?:\/[A-Ga-g][#b]?)?)\]|([^\[]+)/g;
  let m: RegExpExecArray | null;
  const normChord = (s: string) =>
    s.length ? s[0].toUpperCase() + s.slice(1) : s;
  while ((m = re.exec(t)) !== null) {
    if (m[1]) chords.push(normChord(m[1]));
    else if (m[2]) lyric += m[2];
  }
  return { chords, lyric: lyric.trim() };
}

export type LeadSegment = {
  chords: string[];
  lyric: string;
  /** Bars allocated for this line in autoplay (>= 1). */
  measures: number;
};

/** Walk non-tab lines and pair chord rows with lyric rows. */
export function parseLeadSheetFromSource(raw: string): LeadSegment[] {
  const lines = raw.split(/\r?\n/).map((l) => l.trimEnd());
  const segments: LeadSegment[] = [];
  let i = 0;

  const pushSeg = (chords: string[], lyric: string, measures = 2) => {
    const L = lyric.trim();
    if (chords.length === 0 && !L) return;
    segments.push({
      chords,
      lyric: L || "·",
      measures: Math.max(1, Math.min(16, measures)),
    });
  };

  while (i < lines.length) {
    let line = lines[i]?.trim() ?? "";
    if (!line) {
      i++;
      continue;
    }
    if (isTabLine(line)) {
      i++;
      continue;
    }

    line = stripSectionMarkers(line);

    const inline = parseInlineChordLine(line);
    if (inline && (inline.chords.length > 0 || inline.lyric.length > 0)) {
      pushSeg(inline.chords, inline.lyric, 2);
      i++;
      continue;
    }

    if (isChordOnlyLine(line)) {
      const ch = tokenizeChords(line);
      const next = lines[i + 1]?.trim() ?? "";
      if (next && !isTabLine(next) && !isChordOnlyLine(next)) {
        pushSeg(ch, stripSectionMarkers(next), Math.max(2, Math.ceil(ch.length / 2)));
        i += 2;
        continue;
      }
      pushSeg(ch, "", Math.max(2, ch.length));
      i++;
      continue;
    }

    // Plain lyric / note line
    if (!isChordOnlyLine(line)) {
      pushSeg([], line, 2);
    }
    i++;
  }

  return segments;
}

/** When no lyrics in source, one step per chord region with real measure widths. */
export function segmentsFromArrangement(a: ArrangementResult): LeadSegment[] {
  if (a.chordChanges.length === 0) {
    return [
      {
        chords: [a.key || "—"],
        lyric: a.harmonyOverview?.trim() || "Use the score tab for this piece.",
        measures: 4,
      },
    ];
  }
  const sorted = [...a.chordChanges].sort(
    (x, y) => x.measureFrom - y.measureFrom || x.measureTo - y.measureTo,
  );
  return sorted.map((c) => {
    const w = Math.max(1, c.measureTo - c.measureFrom + 1);
    const hint = c.voicing?.trim()?.slice(0, 120) ?? "";
    return {
      chords: [c.symbol],
      lyric: hint ? `Bars ${c.measureFrom}–${c.measureTo} — ${hint}` : `Bars ${c.measureFrom}–${c.measureTo}`,
      measures: w,
    };
  });
}

/** Merge lyric segments with arrangement chords when lyric lines lack chords. */
export function enrichSegmentsWithChords(
  segments: LeadSegment[],
  a: ArrangementResult,
): LeadSegment[] {
  if (a.chordChanges.length === 0) return segments;
  const sorted = [...a.chordChanges].sort(
    (x, y) => x.measureFrom - y.measureFrom,
  );
  let ci = 0;
  return segments.map((s) => {
    if (s.chords.length > 0) return s;
    const sym = sorted[ci]?.symbol;
    if (ci < sorted.length) ci += 1;
    return {
      ...s,
      chords: sym ? [sym] : s.chords,
    };
  });
}
