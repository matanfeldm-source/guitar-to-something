import type { ArrangementStyleId } from "@/lib/instruments";
import type { ArrangementResult } from "@/lib/parseResult";

export const LIBRARY_STORAGE_KEY = "guitar-arranger-library-v1";

export type SavedArrangement = {
  id: string;
  title: string;
  savedAt: string;
  instrumentId: string;
  instrumentName: string;
  style: ArrangementStyleId;
  arrangement: ArrangementResult;
  sourceLabel?: string;
  /** Original pasted / OCR text — used for music mode lyrics & chords. */
  sourceText?: string;
};

function safeParse(raw: string | null): SavedArrangement[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    if (!Array.isArray(v)) return [];
    return v.filter(
      (x): x is SavedArrangement =>
        typeof x === "object" &&
        x !== null &&
        "id" in x &&
        "arrangement" in x &&
        typeof (x as SavedArrangement).title === "string",
    );
  } catch {
    return [];
  }
}

export function loadLibrary(): SavedArrangement[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(LIBRARY_STORAGE_KEY));
}

export function saveToLibrary(
  entry: Omit<SavedArrangement, "id" | "savedAt"> & { id?: string },
): SavedArrangement {
  const list = loadLibrary();
  const id =
    entry.id ?? `save_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const saved: SavedArrangement = {
    ...entry,
    id,
    savedAt: new Date().toISOString(),
  };
  const next = [saved, ...list.filter((x) => x.id !== id)];
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
  return saved;
}

export function deleteFromLibrary(id: string) {
  const list = loadLibrary().filter((x) => x.id !== id);
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(list));
}

export function getFromLibrary(id: string): SavedArrangement | null {
  return loadLibrary().find((x) => x.id === id) ?? null;
}

export function replaceLibrary(items: SavedArrangement[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(items));
}
