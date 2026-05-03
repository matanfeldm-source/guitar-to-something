"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ARRANGEMENT_STYLES } from "@/lib/instruments";
import {
  deleteFromLibrary,
  LIBRARY_STORAGE_KEY,
  loadLibrary,
  replaceLibrary,
  type SavedArrangement,
} from "@/lib/libraryStorage";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

type SortKey = "recent" | "title";

export default function LibraryPage() {
  const [items, setItems] = useState<SavedArrangement[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");

  const refresh = useCallback(() => setItems(loadLibrary()), []);

  useEffect(() => {
    refresh();
    const bump = () => refresh();
    window.addEventListener("guitar-arranger-library", bump);
    return () => window.removeEventListener("guitar-arranger-library", bump);
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (q) {
      list = items.filter(
        (x) =>
          x.title.toLowerCase().includes(q) ||
          x.instrumentName.toLowerCase().includes(q) ||
          x.arrangement.key.toLowerCase().includes(q),
      );
    }
    const next = [...list];
    if (sort === "title") {
      next.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
    } else {
      next.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }
    return next;
  }, [items, query, sort]);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `string-arranger-library-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const v = JSON.parse(String(reader.result)) as unknown;
        if (!Array.isArray(v)) throw new Error("Expected array");
        const merged: SavedArrangement[] = [];
        const seen = new Set<string>();
        for (const x of v) {
          if (typeof x !== "object" || x === null || !("id" in x) || !("arrangement" in x))
            continue;
          const e = x as SavedArrangement;
          if (typeof e.title !== "string") continue;
          if (seen.has(e.id)) continue;
          seen.add(e.id);
          merged.push(e);
        }
        const cur = loadLibrary();
        const byId = new Map<string, SavedArrangement>();
        for (const e of cur) byId.set(e.id, e);
        for (const e of merged) byId.set(e.id, e);
        const next = [...byId.values()].sort(
          (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
        );
        replaceLibrary(next);
        refresh();
        window.dispatchEvent(new Event("guitar-arranger-library"));
      } catch {
        window.alert("Could not import that file. Use a backup exported from this app.");
      }
    };
    reader.readAsText(file);
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 pb-20 pt-10 text-center sm:pt-16">
        <h1 className="font-serif text-3xl font-semibold text-[#2b1810]">Library</h1>
        <p className="mt-4 text-sm leading-relaxed text-[#4a3226]">
          Nothing saved yet. Arrange a tune on the home page, then tap{" "}
          <strong>Save to library</strong>. You can open{" "}
          <strong className="text-[#1d3557]">Music mode</strong> to practice with chords on top
          and lyrics below (works best when your paste includes words + chords).
        </p>
        <p className="mt-3 text-xs text-[#6b4f3b]">
          <strong>Phone install:</strong> deploy the site with HTTPS, then Chrome → menu →{" "}
          <em>Add to Home screen</em> for a fullscreen shortcut.
        </p>
        <Link
          href="/"
          className="btn-primary mt-8 inline-block"
        >
          Start arranging
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-8 sm:pt-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-[#2b1810]">Library</h1>
          <p className="mt-1 text-sm text-[#4a3226]">
            {items.length} saved in this browser · key + chords in each card
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportJson}
            className="btn-ghost rounded-xl px-4 py-2 text-xs font-medium"
          >
            Export backup
          </button>
          <label className="btn-ghost cursor-pointer rounded-xl px-4 py-2 text-xs font-medium">
            Import
            <input
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title, instrument, key…"
          className="w-full rounded-xl border border-[#a18062] bg-[#fffdf8] px-4 py-3 text-sm text-[#1c1410] shadow-inner outline-none focus:ring-2 focus:ring-[#8b5a3c] sm:max-w-xs"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-xl border border-[#a18062] bg-[#fffdf8] px-4 py-3 text-sm text-[#1c1410]"
        >
          <option value="recent">Newest first</option>
          <option value="title">Title A–Z</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-10 text-center text-sm text-[#6b4f3b]">No matches — try another search.</p>
      ) : (
        <ul className="mt-8 space-y-4">
          {filtered.map((item) => (
            <li
              key={item.id}
              className="surface-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_-8px_rgba(42,28,18,0.18)]"
            >
              <div className="p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/library/${item.id}`}
                      className="font-serif text-xl font-semibold text-[#2b1810] hover:text-[#5c3d2e]"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-xs text-[#6b4f3b]">
                      {item.instrumentName} ·{" "}
                      {ARRANGEMENT_STYLES.find((s) => s.id === item.style)?.name ?? item.style} ·{" "}
                      {formatDate(item.savedAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#5c3d2e]/10 px-2.5 py-0.5 text-xs font-medium text-[#5c3d2e]">
                        Key {item.arrangement.key}
                      </span>
                      <span className="rounded-full bg-[#1d3557]/10 px-2.5 py-0.5 text-xs font-medium text-[#1d3557]">
                        {item.arrangement.chordChanges.length} chord regions
                      </span>
                      {item.sourceText?.trim() ? (
                        <span className="rounded-full bg-emerald-800/10 px-2.5 py-0.5 text-xs font-medium text-emerald-900">
                          Lyrics / source saved
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/library/${item.id}/music`}
                    className="rounded-xl bg-gradient-to-b from-[#335887] to-[#1d3557] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-[#3d6499] hover:to-[#243d5c] active:scale-[0.98]"
                  >
                    Music mode
                  </Link>
                  <Link
                    href={`/library/${item.id}`}
                    className="btn-ghost rounded-xl text-sm"
                  >
                    Score &amp; tab
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(`Remove “${item.title}” from the library?`)) return;
                      deleteFromLibrary(item.id);
                      refresh();
                      window.dispatchEvent(new Event("guitar-arranger-library"));
                    }}
                    className="rounded-xl border border-red-200 bg-red-50/80 px-4 py-2 text-sm font-medium text-red-800 transition hover:bg-red-100"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10 text-center text-[11px] leading-relaxed text-[#6b4f3b]">
        Storage key: <code className="rounded bg-[#f4eadf] px-1">{LIBRARY_STORAGE_KEY}</code> in
        localStorage. Export occasionally so you don&apos;t lose titles if you clear site data.
      </p>
    </div>
  );
}
