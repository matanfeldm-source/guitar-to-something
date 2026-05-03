"use client";

import { useState, type ReactNode } from "react";
import type { InstrumentDef } from "@/lib/instruments";
import type { ArrangementResult } from "@/lib/parseResult";
import { inputLooksChordRich } from "@/lib/chordInputHints";
import {
  ChordTimelineView,
  LeadSheetView,
  ScoreSystemsList,
} from "@/components/arrangement/ScoreSystems";

export type ArrangementViewMode = "tab" | "timeline" | "lead";

type Props = {
  result: ArrangementResult;
  instrument: InstrumentDef;
  fromImage?: boolean;
  /** Raw source notation (for chord-rich hint when chordChanges empty). */
  resultSourceRaw?: string | null;
  extraToolbar?: ReactNode;
  /** Sync bow display with parent (e.g. performance mode). */
  readableBow?: boolean;
  onReadableBowChange?: (value: boolean) => void;
};

function TechniquesBlock({ result }: { result: ArrangementResult }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="surface-inset p-4 text-sm">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#5c3d2e]">
          Techniques
        </h4>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#3b2418]">
          {(result.techniques?.length ? result.techniques : ["—"]).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="surface-inset p-4 text-sm">
        <h4 className="text-xs font-bold uppercase tracking-wide text-[#5c3d2e]">
          Playing tips
        </h4>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-[#3b2418]">
          {(result.playingTips?.length ? result.playingTips : ["—"]).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function HarmonyChordTable({
  result,
  instrument,
}: {
  result: ArrangementResult;
  instrument: InstrumentDef;
}) {
  if (
    !result.harmonyOverview?.trim() &&
    result.fidelityNotes.length === 0 &&
    result.chordChanges.length === 0
  ) {
    return null;
  }
  return (
    <div className="surface-card space-y-4 p-5 print:border-[#999]">
      <h3 className="font-serif text-lg font-semibold text-[#2b1810]">
        Harmony &amp; chord voicings
      </h3>
      {result.harmonyOverview?.trim() && (
        <p className="text-sm leading-relaxed text-[#3b2418]">
          {result.harmonyOverview.trim()}
        </p>
      )}
      {result.fidelityNotes.length > 0 && (
        <div>
          <h4 className="text-xs font-bold uppercase text-[#5c3d2e]">
            Fidelity (what matches the original)
          </h4>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[#3b2418]">
            {result.fidelityNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {result.chordChanges.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse overflow-hidden rounded-lg text-left text-sm">
            <thead>
              <tr className="border-b border-[#cfc4a8] bg-[#f5ede0]/80 text-xs uppercase tracking-wide text-[#5c3d2e]">
                <th className="pb-2 pr-3 font-semibold">Measures</th>
                <th className="pb-2 pr-3 font-semibold">Chord</th>
                <th className="pb-2 pr-3 font-semibold">Guitar hint</th>
                <th className="pb-2 font-semibold">Voicing ({instrument.name})</th>
              </tr>
            </thead>
            <tbody>
              {result.chordChanges.map((c, i) => (
                <tr
                  key={`${c.symbol}-${c.measureFrom}-${i}`}
                  className="align-top border-b border-[#e8dfc9] last:border-0 odd:bg-[#fffdf8]/50"
                >
                  <td className="py-2 pr-3 font-mono text-[#4a3226]">
                    {c.measureFrom}
                    {c.measureTo !== c.measureFrom ? `–${c.measureTo}` : ""}
                  </td>
                  <td className="py-2 pr-3 font-semibold text-[#3b2418]">{c.symbol}</td>
                  <td className="py-2 pr-3 text-[#4a3226]">{c.guitarOrigin ?? "—"}</td>
                  <td className="py-2 text-[#3b2418]">
                    <p className="leading-relaxed">{c.voicing || "—"}</p>
                    {c.tabMini?.trim() && (
                      <pre className="mt-2 overflow-x-auto rounded bg-[#fffdf8] px-2 py-1 font-mono text-xs leading-tight text-[#1c1410]">
                        {c.tabMini.trim()}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function ArrangementResultPanel({
  result,
  instrument,
  fromImage,
  resultSourceRaw,
  extraToolbar,
  readableBow: readableBowControlled,
  onReadableBowChange,
}: Props) {
  const [viewMode, setViewMode] = useState<ArrangementViewMode>("tab");
  const [readableBowInternal, setReadableBowInternal] = useState(true);
  const readableBow = readableBowControlled ?? readableBowInternal;
  const setReadableBow = onReadableBowChange ?? setReadableBowInternal;
  const [sheetLayout, setSheetLayout] = useState(false);

  const chordRichWarn =
    Boolean(resultSourceRaw?.trim()) &&
    inputLooksChordRich(resultSourceRaw!) &&
    result.chordChanges.length === 0;

  const viewBtn = (id: ArrangementViewMode, label: string) => (
    <button
      type="button"
      onClick={() => setViewMode(id)}
      className={`rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
        viewMode === id
          ? "bg-[#fffcf7] text-[#3b2418] shadow-sm ring-1 ring-[#5c3d2e]/20"
          : "text-[#5c4a3f] hover:bg-[#ebe4d6]/80 hover:text-[#2b1810]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <section
      className={`score-sheet mt-10 print:mt-6 ${
        sheetLayout && viewMode === "tab"
          ? "surface-card mx-auto flex max-w-3xl flex-col gap-6 px-5 py-8 md:px-10 print:max-w-none print:border-0 print:shadow-none"
          : "space-y-6"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dfd3bc] pb-5 print:border-[#999]">
        <div>
          {fromImage && (
            <span className="mb-2 inline-block rounded-full bg-gradient-to-r from-[#1d3557] to-[#284870] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#f8fafc] shadow-sm print:bg-[#333] print:text-white">
              From image
            </span>
          )}
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-[#2b1810] md:text-3xl">
            Score — {instrument.name}
          </h2>
          <p className="mt-2 text-sm text-[#5c4a3f]">
            <span className="font-medium text-[#3b2418]">{result.key}</span>
            <span className="mx-2 text-[#c9b896]">·</span>
            {result.timeSignature}
            <span className="mx-2 text-[#c9b896]">·</span>
            {result.tempo}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 print:hidden">{extraToolbar}</div>
      </div>

      <div className="flex flex-col gap-3 border-b border-[#e8dfc9] pb-4 print:hidden">
        <p className="hero-eyebrow font-sans">View layout</p>
        <div className="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-[#cfc4a8] bg-[#ebe4d6]/70 p-1 shadow-[inset_0_1px_2px_rgba(42,28,18,0.06)]">
          {viewBtn("tab", "Tab + table")}
          {viewBtn("timeline", "Chord timeline")}
          {viewBtn("lead", "Lead sheet")}
        </div>
        {viewMode === "tab" && (
          <div className="flex flex-wrap items-center gap-4 text-sm text-[#4a3226]">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={readableBow}
                onChange={(e) => setReadableBow(e.target.checked)}
                className="rounded border-[#a18062] text-[#5c3d2e] focus:ring-[#8b5a3c]"
              />
              Simpler bow (by measure)
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={sheetLayout}
                onChange={(e) => setSheetLayout(e.target.checked)}
                className="rounded border-[#a18062] text-[#5c3d2e] focus:ring-[#8b5a3c]"
              />
              Sheet layout (tab-focused)
            </label>
          </div>
        )}
        {viewMode !== "tab" && (
          <label className="flex cursor-pointer items-center gap-2 text-sm text-[#4a3226]">
            <input
              type="checkbox"
              checked={readableBow}
              onChange={(e) => setReadableBow(e.target.checked)}
              className="rounded border-[#a18062] text-[#5c3d2e] focus:ring-[#8b5a3c]"
            />
            Simpler bow (by measure)
          </label>
        )}
      </div>

      {viewMode === "tab" && chordRichWarn && (
        <div
          className={`rounded-lg border border-amber-700/40 bg-amber-50 px-4 py-3 text-sm text-amber-950 print:border-amber-200 ${
            sheetLayout ? "order-1" : ""
          }`}
        >
          Your input looked chord-heavy, but this response has no{" "}
          <strong>chord timeline</strong>. Try again with style{" "}
          <strong>Chord-first / comp</strong> or <strong>Simplified harmony</strong>, spell out
          chords in a{" "}
          <code className="rounded bg-amber-100/80 px-1">Chords: | Am | F | …</code> line, or
          add details in <strong>Optional context</strong>.
        </div>
      )}

      {viewMode === "tab" &&
        (result.harmonyOverview?.trim() ||
          result.fidelityNotes.length > 0 ||
          result.chordChanges.length > 0) &&
        (sheetLayout ? (
          <details className="order-5 rounded-xl border border-[#b08d6a] bg-[#fdf6ec] print:border-[#999]">
            <summary className="cursor-pointer list-none p-4 font-serif text-lg text-[#3b2418] marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="underline decoration-[#a18062] decoration-2 underline-offset-2">
                Chords &amp; harmony reference
              </span>
              <span className="ml-2 text-xs font-sans font-normal text-[#6b4f3b]">
                (expand)
              </span>
            </summary>
            <div className="space-y-4 border-t border-[#d6bc9a] px-4 pb-4 pt-3">
              {result.harmonyOverview?.trim() && (
                <p className="text-sm leading-relaxed text-[#3b2418]">
                  {result.harmonyOverview.trim()}
                </p>
              )}
              {result.fidelityNotes.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase text-[#5c3d2e]">
                    Fidelity (what matches the original)
                  </h4>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-[#3b2418]">
                    {result.fidelityNotes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.chordChanges.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#a18062] text-xs uppercase tracking-wide text-[#5c3d2e]">
                        <th className="pb-2 pr-3 font-semibold">Measures</th>
                        <th className="pb-2 pr-3 font-semibold">Chord</th>
                        <th className="pb-2 pr-3 font-semibold">Guitar hint</th>
                        <th className="pb-2 font-semibold">Voicing ({instrument.name})</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.chordChanges.map((c, i) => (
                        <tr
                          key={`${c.symbol}-${c.measureFrom}-${i}`}
                          className="align-top border-b border-[#e8dfc9] last:border-0 odd:bg-[#fffdf8]/50"
                        >
                          <td className="py-2 pr-3 font-mono text-[#4a3226]">
                            {c.measureFrom}
                            {c.measureTo !== c.measureFrom ? `–${c.measureTo}` : ""}
                          </td>
                          <td className="py-2 pr-3 font-semibold text-[#3b2418]">
                            {c.symbol}
                          </td>
                          <td className="py-2 pr-3 text-[#4a3226]">
                            {c.guitarOrigin ?? "—"}
                          </td>
                          <td className="py-2 text-[#3b2418]">
                            <p className="leading-relaxed">{c.voicing || "—"}</p>
                            {c.tabMini?.trim() && (
                              <pre className="mt-2 overflow-x-auto rounded bg-[#fffdf8] px-2 py-1 font-mono text-xs leading-tight text-[#1c1410]">
                                {c.tabMini.trim()}
                              </pre>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </details>
        ) : (
          <HarmonyChordTable result={result} instrument={instrument} />
        ))}

      {viewMode === "tab" &&
        (sheetLayout ? (
          <details className="order-6 rounded-lg border border-[#d6bc9a] bg-[#fffdf8] print:border-[#999]">
            <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-[#5c3d2e] marker:content-none [&::-webkit-details-marker]:hidden">
              Techniques &amp; playing tips
              <span className="ml-2 text-xs font-normal text-[#6b4f3b]">(expand)</span>
            </summary>
            <div className="grid gap-4 border-t border-[#e6d3bc] p-3 md:grid-cols-2">
              <div className="text-sm">
                <h4 className="text-xs font-bold uppercase text-[#5c3d2e]">Techniques</h4>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {(result.techniques?.length ? result.techniques : ["—"]).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
              <div className="text-sm">
                <h4 className="text-xs font-bold uppercase text-[#5c3d2e]">Playing tips</h4>
                <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                  {(result.playingTips?.length ? result.playingTips : ["—"]).map((t, i) => (
                    <li key={i}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </details>
        ) : (
          <TechniquesBlock result={result} />
        ))}

      {viewMode === "tab" &&
        (sheetLayout ? (
          <details className="order-7 rounded-lg border border-[#d6bc9a] bg-[#fffdf8] print:border-[#999]">
            <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-[#5c3d2e] marker:content-none [&::-webkit-details-marker]:hidden">
              Arrangement notes
              <span className="ml-2 text-xs font-normal text-[#6b4f3b]">(expand)</span>
            </summary>
            <p className="border-t border-[#e6d3bc] p-3 text-sm leading-relaxed text-[#3b2418]">
              {result.arrangementNotes}
            </p>
          </details>
        ) : (
          <p className="text-sm leading-relaxed text-[#3b2418]">{result.arrangementNotes}</p>
        ))}

      {viewMode === "tab" && (
        <ScoreSystemsList
          result={result}
          instrument={instrument}
          readableBow={readableBow}
          sheetLayout={sheetLayout}
        />
      )}

      {viewMode === "timeline" && (
        <div className="space-y-6">
          <ChordTimelineView
            result={result}
            instrument={instrument}
            readableBow={readableBow}
          />
          {result.fidelityNotes.length > 0 && (
            <div className="rounded-lg border border-[#d6bc9a] bg-[#fffdf8] p-3 text-sm">
              <h4 className="text-xs font-bold uppercase text-[#5c3d2e]">Fidelity</h4>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {result.fidelityNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <details className="rounded-lg border border-[#d6bc9a] bg-[#fffdf8] print:border-[#999]">
            <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-[#5c3d2e]">
              Techniques, tips &amp; notes
            </summary>
            <div className="space-y-3 border-t border-[#e6d3bc] p-3">
              <TechniquesBlock result={result} />
              <p className="text-sm leading-relaxed text-[#3b2418]">{result.arrangementNotes}</p>
            </div>
          </details>
        </div>
      )}

      {viewMode === "lead" && (
        <div className="space-y-6">
          <LeadSheetView
            result={result}
            instrument={instrument}
            readableBow={readableBow}
          />
          {result.fidelityNotes.length > 0 && (
            <div className="rounded-lg border border-[#d6bc9a] bg-[#fffdf8] p-3 text-sm">
              <h4 className="text-xs font-bold uppercase text-[#5c3d2e]">Fidelity</h4>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {result.fidelityNotes.map((n, i) => (
                  <li key={i}>{n}</li>
                ))}
              </ul>
            </div>
          )}
          <details className="rounded-lg border border-[#d6bc9a] bg-[#fffdf8]">
            <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-[#5c3d2e]">
              Full chord table (voicings)
            </summary>
            <div className="border-t border-[#e6d3bc] p-3">
              <HarmonyChordTable result={result} instrument={instrument} />
            </div>
          </details>
          <details className="rounded-lg border border-[#d6bc9a] bg-[#fffdf8] print:border-[#999]">
            <summary className="cursor-pointer list-none p-3 text-sm font-semibold text-[#5c3d2e]">
              Techniques, tips &amp; arrangement notes
            </summary>
            <div className="space-y-3 border-t border-[#e6d3bc] p-3">
              <TechniquesBlock result={result} />
              <p className="text-sm leading-relaxed text-[#3b2418]">{result.arrangementNotes}</p>
            </div>
          </details>
        </div>
      )}
    </section>
  );
}
