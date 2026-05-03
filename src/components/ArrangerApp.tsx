"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ARRANGEMENT_STYLES,
  INSTRUMENTS,
  type ArrangementStyleId,
  type InstrumentDef,
} from "@/lib/instruments";
import type { ArrangementResult } from "@/lib/parseResult";
import ArrangementResultPanel from "@/components/ArrangementResultPanel";
import { rowColor } from "@/components/arrangement/ScoreSystems";
import { saveToLibrary } from "@/lib/libraryStorage";
import { EXAMPLE_TABS } from "@/lib/samples";
import { formatBowReadable } from "@/lib/tabDisplay";

type InputMode = "text" | "image";

type LoadingPhase = "idle" | "ocr" | "arrange";

function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      const m = /^data:([^;]+);base64,(.+)$/.exec(res);
      if (m) resolve({ mediaType: m[1], base64: m[2] });
      else reject(new Error("Could not read image as data URL."));
    };
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.readAsDataURL(file);
  });
}

function tabInputStrength(text: string): "ok" | "weak" {
  const t = text.trim();
  if (t.length < 8) return "weak";
  const hasFretsOrNumbers = /\d/.test(t);
  const hasStaffLike = /[\-|]{4,}/.test(t);
  const guitarish = /^[eEbBgGdDaA]\s*[|]/m.test(t);
  if (hasFretsOrNumbers && hasStaffLike && (guitarish || t.split(/\n/).length >= 4))
    return "ok";
  const chordish =
    /\b[A-G][#b]?(m|maj|min|dim|aug|sus|add)?[0-9]*\b/.test(t) &&
    (t.split(/\n/).length >= 3 || /\[+[A-G]/.test(t));
  if (chordish) return "ok";
  return "weak";
}

function buildCopyText(a: ArrangementResult): string {
  if (a.plainTextScore?.trim()) return a.plainTextScore.trim();
  const lines: string[] = [
    `${a.key} · ${a.timeSignature} · ${a.tempo}`,
    "",
  ];
  for (const sys of a.systems) {
    lines.push(`Measures ${sys.measureStart}–${sys.measureEnd}`);
    if (sys.bowLine?.trim()) lines.push(`Bow: ${sys.bowLine}`);
    for (const r of sys.rows) {
      lines.push(`${r.label.padEnd(3, " ")}${r.line}`);
    }
    lines.push("");
  }
  return lines.join("\n").trim();
}

function buildChordGuideText(a: ArrangementResult): string {
  const lines: string[] = [];
  if (a.harmonyOverview?.trim()) {
    lines.push("Harmony overview");
    lines.push(a.harmonyOverview.trim());
    lines.push("");
  }
  if (a.fidelityNotes.length > 0) {
    lines.push("Fidelity (source vs. this arrangement)");
    for (const n of a.fidelityNotes) lines.push(`- ${n}`);
    lines.push("");
  }
  if (a.chordChanges.length > 0) {
    lines.push("Chords & voicings");
    for (const c of a.chordChanges) {
      lines.push(
        `mm.${c.measureFrom}–${c.measureTo}  ${c.symbol}${
          c.guitarOrigin ? `  (guitar: ${c.guitarOrigin})` : ""
        }`,
      );
      if (c.voicing.trim()) lines.push(c.voicing.trim());
      if (c.tabMini?.trim()) {
        lines.push(c.tabMini.trim());
      }
      lines.push("");
    }
  }
  return lines.join("\n").trim();
}

function buildFullCopyText(a: ArrangementResult): string {
  const guide = buildChordGuideText(a);
  const score = buildCopyText(a);
  if (!guide) return score;
  return `${guide}\n\n---\n\n${score}`;
}

export default function ArrangerApp() {
  const instrumentList = useMemo(() => Object.values(INSTRUMENTS), []);
  const [instrumentId, setInstrumentId] = useState(instrumentList[0]?.id ?? "violin");
  const instrument =
    INSTRUMENTS[instrumentId] ?? instrumentList[0] ?? INSTRUMENTS.violin;

  const [style, setStyle] = useState<ArrangementStyleId>("melody");
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [tabText, setTabText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const imagePreviewUrl = useMemo(
    () => (imageFile ? URL.createObjectURL(imageFile) : null),
    [imageFile],
  );

  const [phase, setPhase] = useState<LoadingPhase>("idle");
  const [progressMsg, setProgressMsg] = useState("");
  const [extractedNotation, setExtractedNotation] = useState<string | null>(null);
  const [ocrNotes, setOcrNotes] = useState<string | null>(null);
  const [fromImage, setFromImage] = useState(false);

  const [contextNotes, setContextNotes] = useState("");
  const [resultSourceRaw, setResultSourceRaw] = useState<string | null>(null);

  const [result, setResult] = useState<ArrangementResult | null>(null);
  const [rawFallback, setRawFallback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [perfOpen, setPerfOpen] = useState(false);
  const [readableBow, setReadableBow] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!imagePreviewUrl) return;
    return () => URL.revokeObjectURL(imagePreviewUrl);
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (!perfOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPerfOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [perfOpen]);

  const resetOutput = useCallback(() => {
    setResult(null);
    setResultSourceRaw(null);
    setRawFallback(null);
    setError(null);
    setExtractedNotation(null);
    setOcrNotes(null);
    setFromImage(false);
  }, []);

  const runArrange = useCallback(
    async (sourceNotation: string) => {
      setError(null);
      setRawFallback(null);
      setProgressMsg("Arranging for your instrument…");
      setPhase("arrange");
      try {
        const res = await fetch("/api/music", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "arrange",
            input: sourceNotation,
            instrumentId,
            style,
            contextNotes: contextNotes.trim() || undefined,
          }),
        });
        const data = (await res.json()) as {
          arrangement?: ArrangementResult;
          error?: string;
          rawText?: string;
          parseError?: string;
          truncated?: boolean;
        };
        if (!res.ok) {
          let msg = data.error ?? "Arrangement failed.";
          if (data.truncated) {
            msg +=
              " The model response was cut off before JSON finished. Try a shorter excerpt, set GEMINI_MAX_OUTPUT_TOKENS higher in .env.local (up to 65536), or use a simpler arrangement style.";
          }
          setError(msg);
          if (data.rawText) setRawFallback(data.rawText);
          return;
        }
        if (data.arrangement) {
          setResult(data.arrangement);
          setResultSourceRaw(sourceNotation);
          setRawFallback(null);
        } else {
          setError(data.error ?? "Unexpected empty arrangement.");
          if (data.rawText) setRawFallback(data.rawText);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setPhase("idle");
        setProgressMsg("");
      }
    },
    [contextNotes, instrumentId, style],
  );

  const onSubmit = useCallback(async () => {
    resetOutput();

    if (inputMode === "text") {
      const src = tabText.trim();
      if (src.length < 4) {
        setError("Add a bit more notation to arrange — paste tab or notes.");
        return;
      }
      await runArrange(src);
      setFromImage(false);
      return;
    }

    if (!imageFile) {
      setError("Choose a photo or screenshot of notation first.");
      return;
    }

    setPhase("ocr");
    setProgressMsg("Reading notation from your image (step 1 of 2)…");
    try {
      const { base64, mediaType } = await fileToBase64(imageFile);
      const ocrRes = await fetch("/api/music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "ocr",
          imageBase64: base64,
          mediaType,
        }),
      });
      const ocrData = (await ocrRes.json()) as {
        ocr?: {
          extractedNotation: string;
          notesForPlayer?: string;
          noMusicFound?: boolean;
        };
        error?: string;
        rawText?: string;
      };

      if (!ocrRes.ok) {
        setError(ocrData.error ?? "Image read failed.");
        if (ocrData.rawText) setRawFallback(ocrData.rawText);
        setPhase("idle");
        return;
      }

      const o = ocrData.ocr;
      if (!o) {
        setError("No OCR payload returned.");
        setPhase("idle");
        return;
      }
      if (o.noMusicFound) {
        setError(
          "No readable notation found in that image. Try a brighter, closer crop (printed tab or staff works best).",
        );
        setExtractedNotation("");
        setPhase("idle");
        return;
      }

      setExtractedNotation(o.extractedNotation);
      setOcrNotes(o.notesForPlayer ?? null);
      setFromImage(true);

      if (!o.extractedNotation.trim()) {
        setError("OCR returned empty notation.");
        setPhase("idle");
        return;
      }

      await runArrange(o.extractedNotation);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("idle");
      setProgressMsg("");
    }
  }, [imageFile, inputMode, resetOutput, runArrange, tabText]);

  const onPickFile = (f: File | null) => {
    if (!f || !f.type.startsWith("image/")) return;
    setImageFile(f);
    resetOutput();
  };

  const copyScore = async () => {
    if (!result) return;
    const text = buildFullCopyText(result);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* fallback silent */
    }
  };

  const copyChordsOnly = async () => {
    if (!result) return;
    const text = buildChordGuideText(result);
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* fallback silent */
    }
  };

  const hint = tabInputStrength(tabText);

  return (
    <div className="min-h-screen text-[#1a110c] print:bg-white">
      <div className="mx-auto max-w-5xl px-4 py-10 pb-16 print:py-4 sm:px-5">
        <header className="relative border-b border-[#cfc4a8]/90 pb-8 print:border-[#999]">
          <div className="absolute -left-4 top-0 hidden h-24 w-1 rounded-full bg-gradient-to-b from-[#8b5a3c] to-transparent opacity-40 md:block" aria-hidden />
          <p className="hero-eyebrow font-sans">AI arranger</p>
          <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold leading-tight tracking-tight text-[#2b1810] md:text-[2.35rem] md:leading-snug">
            Guitar source → string instrument tab
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#5c4a3f] md:text-base">
            Paste ASCII guitar tab, a chord chart (lyrics + chord symbols), or upload a
            photo. The server calls Google Gemini securely, uses a dedicated image-reading step
            when needed, then returns aligned tab plus chord voicings for your
            instrument — with performance mode and print support.
          </p>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="surface-card space-y-6 p-6 print:border-[#ccc] print:shadow-none sm:p-7">
            <div className="inline-flex flex-wrap gap-1 rounded-full border border-[#dfd3bc] bg-[#f5ede0]/80 p-1">
              <button
                type="button"
                onClick={() => {
                  setInputMode("text");
                  resetOutput();
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  inputMode === "text"
                    ? "bg-[#5c3d2e] text-[#fff9f0] shadow-md"
                    : "text-[#3b2418] hover:bg-[#ebe4d6]"
                }`}
              >
                Text tab
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode("image");
                  resetOutput();
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
                  inputMode === "image"
                    ? "bg-[#5c3d2e] text-[#fff9f0] shadow-md"
                    : "text-[#3b2418] hover:bg-[#ebe4d6]"
                }`}
              >
                Photo / scan
              </button>
            </div>

            {inputMode === "text" ? (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wide text-[#5c3d2e]">
                  Guitar / chord / sketch notation
                </label>
                <p className="text-xs leading-relaxed text-[#6b4f3b]">
                  From a chord website: select the chart or lyrics-with-chords, copy,
                  and paste here (this app does not fetch URLs for safety).
                </p>
                <textarea
                  value={tabText}
                  onChange={(e) => {
                    setTabText(e.target.value);
                    resetOutput();
                  }}
                  rows={14}
                  className="field-input w-full px-4 py-3 font-mono text-sm leading-relaxed text-[#1c1410] outline-none"
                  placeholder="e|--0--2--| B|--1--3--| …  or paste lyrics with chord names / [Am] markers"
                  spellCheck={false}
                />
                {hint === "weak" && tabText.trim().length > 0 && (
                  <p className="text-xs text-[#92400e]">
                    Tip: use classic tab (e| … per string) or clear chord symbols with
                    line breaks so harmony is easy to read.
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_TABS.map((ex) => (
                    <button
                      key={ex.id}
                      type="button"
                      onClick={() => {
                        setTabText(ex.tab);
                        resetOutput();
                      }}
                      className="rounded-full border border-[#c9b896] bg-[#fffcf7] px-3 py-1.5 text-xs font-medium text-[#422b1f] shadow-sm transition hover:border-[#8b5a3c] hover:bg-[#faf5ec] hover:shadow"
                    >
                      {ex.title}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#c9b896] bg-[#fffcf7]/80 px-4 py-12 text-center shadow-inner transition hover:border-[#8b5a3c] hover:bg-[#faf5ec]"
                >
                  <span className="text-lg font-serif font-medium">
                    Drop, browse, or use camera
                  </span>
                  <span className="mt-1 text-xs text-[#6b4f3b]">
                    PNG, JPEG, WebP — well-lit printed notation works best.
                  </span>
                </button>
                {imagePreviewUrl && (
                  <div className="overflow-hidden rounded-lg border border-[#c4a574] bg-black/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreviewUrl}
                      alt="Uploaded notation preview"
                      className="max-h-64 w-full object-contain"
                    />
                  </div>
                )}
                {imageFile && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setImageFile(null);
                        resetOutput();
                      }}
                      className="btn-ghost text-sm"
                    >
                      Remove image
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn-ghost text-sm"
                    >
                      Replace
                    </button>
                  </div>
                )}
              </div>
            )}

            <div
              className="surface-inset p-4 text-xs text-[#5c4030]"
              onDragOver={(e) => {
                if (inputMode !== "image") return;
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (inputMode !== "image") return;
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) onPickFile(f);
              }}
            >
              {inputMode === "image" && (
                <p className="mb-2">You can also drag a picture onto this card.</p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#5c3d2e]">
                    Instrument
                  </label>
                  <select
                    value={instrumentId}
                    onChange={(e) => {
                      setInstrumentId(e.target.value);
                      resetOutput();
                    }}
                    className="field-input mt-1 w-full px-3 py-2.5 text-sm"
                  >
                    {instrumentList.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] leading-snug text-[#6b4f3b]">
                    {instrument.tuningDescription}
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#5c3d2e]">
                    Style
                  </label>
                  <select
                    value={style}
                    onChange={(e) => {
                      setStyle(e.target.value as ArrangementStyleId);
                      resetOutput();
                    }}
                    className="field-input mt-1 w-full px-3 py-2.5 text-sm"
                  >
                    {ARRANGEMENT_STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-[11px] leading-snug text-[#6b4f3b]">
                    {ARRANGEMENT_STYLES.find((x) => x.id === style)?.hint}
                  </p>
                </div>
              </div>
              <div className="mt-3 w-full">
                <label
                  htmlFor="context-notes"
                  className="block text-[11px] font-bold uppercase text-[#5c3d2e]"
                >
                  Optional context for the arranger
                </label>
                <textarea
                  id="context-notes"
                  value={contextNotes}
                  onChange={(e) => {
                    setContextNotes(e.target.value);
                    resetOutput();
                  }}
                  rows={2}
                  placeholder="e.g. Capo 2, treat shapes as key of D, tune down half step, song is fingerpicked"
                  className="field-input mt-1 w-full px-3 py-2.5 text-sm text-[#1c1410] placeholder:text-[#a18072]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={phase !== "idle"}
                onClick={onSubmit}
                className="btn-primary"
              >
                {phase === "idle" ? "Generate arrangement" : "Working…"}
              </button>
              {error && (
                <button
                  type="button"
                  onClick={onSubmit}
                  className="btn-ghost rounded-xl border-amber-800/30 text-amber-950 hover:bg-amber-50"
                >
                  Retry
                </button>
              )}
              {phase !== "idle" && (
                <span className="text-sm text-[#5c3d2e]">{progressMsg}</span>
              )}
            </div>

            {phase !== "idle" && (
              <div className="h-1 w-full overflow-hidden rounded-full bg-[#e6d3bc]">
                <div className="h-full w-1/3 animate-pulse rounded-full bg-[#8b5a3c]" />
              </div>
            )}
          </section>

          <aside className="space-y-4 print:hidden lg:pt-2">
            <div className="surface-card p-5 text-sm text-[#3b2418]">
              <h2 className="font-serif text-lg font-semibold text-[#2b1810]">Legend</h2>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed">
                <li>E / A / D / G (or instrument set) use fixed colors per course.</li>
                <li>Bow hints use v / ^ when the model supplies them.</li>
                <li>
                  Lyrics + chords from the web: paste here; use <strong>Chord-first</strong>{" "}
                  style for a richer voicing table.
                </li>
                <li>Optional context box: capo, key, or tuning notes steer fidelity.</li>
                <li>
                  <strong>Library:</strong> save any result from the toolbar; it is stored in this
                  browser only (<strong>localStorage</strong>).
                </li>
                <li>
                  Switch <strong>View</strong> on the score: tab + table, chord timeline, or lead
                  sheet — all include the full tab.
                </li>
                <li>
                  In tab view: <strong>Simpler bow</strong> and <strong>Sheet layout</strong> work
                  as before.
                </li>
                <li>
                  <strong>Android / install:</strong> open the site in Chrome → menu →{" "}
                  <strong>Add to Home screen</strong> for a standalone app shortcut (PWA).
                </li>
              </ul>
            </div>
            <div className="surface-inset p-4 text-xs leading-relaxed text-[#4a3226]">
              <p className="font-semibold text-[#5c3d2e]">Privacy</p>
              <p className="mt-1">
                Your Gemini API key stays in{" "}
                <code className="rounded bg-[#f4eadf] px-1">.env.local</code> on the server. The
                browser never sees it.
              </p>
            </div>
          </aside>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-950 shadow-sm ring-1 ring-red-100">
            {error}
          </div>
        )}

        {extractedNotation !== null && inputMode === "image" && (
          <section className="surface-card mt-8 p-5">
            <h3 className="font-serif text-lg font-semibold text-[#2b1810]">Extracted notation</h3>
            {ocrNotes && (
              <p className="mt-1 text-xs text-[#92400e]">OCR note: {ocrNotes}</p>
            )}
            <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-[#f7efe6] p-3 font-mono text-xs leading-relaxed text-[#1c1410]">
              {extractedNotation || "—"}
            </pre>
          </section>
        )}

        {result && (
          <>
            <ArrangementResultPanel
              result={result}
              instrument={instrument}
              fromImage={fromImage}
              resultSourceRaw={resultSourceRaw}
              readableBow={readableBow}
              onReadableBowChange={setReadableBow}
              extraToolbar={
                <>
                  <button
                    type="button"
                    onClick={copyScore}
                    className="btn-ghost rounded-xl text-sm"
                  >
                    Copy tab + chords
                  </button>
                  <button
                    type="button"
                    disabled={!buildChordGuideText(result)}
                    onClick={copyChordsOnly}
                    className="btn-ghost rounded-xl text-sm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Copy chords only
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="btn-ghost rounded-xl text-sm"
                  >
                    Print / PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setPerfOpen(true)}
                    className="rounded-xl bg-gradient-to-b from-[#335887] to-[#1d3557] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-[#3d6499] hover:to-[#243d5c] active:scale-[0.98]"
                  >
                    Performance mode
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const guess =
                        tabText
                          .trim()
                          .split(/\r?\n/)
                          .find((l) => l.trim())
                          ?.slice(0, 72) ??
                        resultSourceRaw
                          ?.trim()
                          .split(/\r?\n/)
                          .find((l) => l.trim())
                          ?.slice(0, 72) ??
                        `${instrument.name} — ${result.key}`;
                      const title = window.prompt("Save to library as…", guess)?.trim();
                      if (!title) return;
                      saveToLibrary({
                        title,
                        instrumentId: instrument.id,
                        instrumentName: instrument.name,
                        style,
                        arrangement: result,
                        sourceLabel: fromImage ? "Photo" : "Paste",
                        sourceText: (resultSourceRaw ?? tabText).trim() || undefined,
                      });
                      window.dispatchEvent(new Event("guitar-arranger-library"));
                    }}
                    className="btn-ghost rounded-xl border-[#1d3557] bg-[#e8f4fc]/90 text-[#14213d] hover:bg-[#d6ebf7]"
                  >
                    Save to library
                  </button>
                </>
              }
            />
          </>
        )}
        {rawFallback && !result && (
          <details className="surface-card mt-8 p-4 text-sm">
            <summary className="cursor-pointer font-medium text-[#5c3d2e]">
              Model raw text (for debugging)
            </summary>
            <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-mono text-xs text-[#1c1410]">
              {rawFallback}
            </pre>
          </details>
        )}
      </div>

      {perfOpen && result && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0f172a] text-[#e2e8f0]">
          <div className="flex items-center justify-between border-b border-[#334155] px-4 py-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#94a3b8]">
                Performance — {instrument.name}
              </p>
              <p className="font-mono text-sm text-[#f8fafc]">
                {result.key} · {result.timeSignature} · {result.tempo}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPerfOpen(false)}
              className="rounded-md border border-[#475569] px-3 py-1.5 text-sm hover:bg-[#1e293b]"
            >
              Close (Esc)
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
            {result.systems.map((sys, idx) => (
              <div key={idx} className="mb-10">
                <p className="mb-2 text-xs text-[#94a3b8]">
                  mm. {sys.measureStart}–{sys.measureEnd}
                </p>
                {sys.bowLine && instrument.bowing && (
                  <>
                    {readableBow ? (
                      <div className="mb-2 text-base text-amber-100">
                        <span className="font-semibold text-amber-200">
                          Bow (compact):{" "}
                        </span>
                        <span className="font-mono">{formatBowReadable(sys.bowLine)}</span>
                      </div>
                    ) : (
                      <div className="mb-2 font-mono text-lg text-amber-200">
                        {sys.bowLine}
                      </div>
                    )}
                  </>
                )}
                <div className="font-mono text-xl leading-tight md:text-2xl">
                  {sys.rows.map((r) => (
                    <div key={r.label} className="flex gap-3">
                      <span
                        className="w-8 shrink-0 text-right"
                        style={{ color: rowColor(instrument, r.label) }}
                      >
                        {r.label}
                      </span>
                      <span style={{ color: rowColor(instrument, r.label) }}>
                        {r.line}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
