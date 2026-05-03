import { formatBowReadable } from "@/lib/tabDisplay";
import type { InstrumentDef } from "@/lib/instruments";
import type { ArrangementResult } from "@/lib/parseResult";

export function rowColor(inst: InstrumentDef, label: string): string {
  const i = inst.stringLabels.findIndex(
    (L) => L.toLowerCase() === label.toLowerCase(),
  );
  if (i >= 0) return inst.stringColors[i] ?? "#444";
  return "#44403c";
}

type ScoreProps = {
  result: ArrangementResult;
  instrument: InstrumentDef;
  readableBow: boolean;
  sheetLayout: boolean;
};

export function ScoreSystemsList({
  result,
  instrument,
  readableBow,
  sheetLayout,
}: ScoreProps) {
  return (
    <div className={`space-y-8 ${sheetLayout ? "order-4" : ""}`}>
      {result.systems.map((sys, idx) => (
        <div
          key={`${sys.measureStart}-${sys.measureEnd}-${idx}`}
          className={`overflow-x-auto rounded-2xl border border-[#cfc4a8] bg-gradient-to-b from-[#fffdf8] to-[#faf5ec] p-5 shadow-[0_6px_24px_-6px_rgba(42,28,18,0.1)] ring-1 ring-black/[0.03] ${
            sheetLayout ? "print:shadow-none" : ""
          }`}
        >
          <p
            className={`mb-2 font-mono text-xs text-[#6b4f3b] ${sheetLayout ? "text-sm font-semibold" : ""}`}
          >
            Measures {sys.measureStart} – {sys.measureEnd}
          </p>
          {sys.bowLine && instrument.bowing && (
            <>
              {readableBow ? (
                <div className="mb-3 rounded-md bg-[#f7efe6] px-2 py-2 text-sm text-[#1c1410]">
                  <span className="font-semibold text-[#5c3d2e]">
                    Bow (compact, by bar)
                  </span>
                  <p className="mt-1 font-mono text-xs leading-relaxed md:text-sm">
                    {formatBowReadable(sys.bowLine)}
                  </p>
                </div>
              ) : (
                <div className="mb-1 font-mono text-sm text-[#1c1410]">
                  <span className="text-[#5c3d2e]">Bow </span>
                  <span className="tracking-tight">{sys.bowLine}</span>
                </div>
              )}
            </>
          )}
          <div
            className={`font-mono leading-tight md:leading-snug ${
              sheetLayout ? "text-[14px] md:text-base" : "text-[13px] md:text-sm"
            }`}
          >
            {sys.rows.map((r) => (
              <div key={r.label + idx} className="flex gap-2">
                <span
                  className="w-6 shrink-0 text-right font-semibold"
                  style={{ color: rowColor(instrument, r.label) }}
                >
                  {r.label}
                </span>
                <span
                  className="whitespace-pre"
                  style={{ color: rowColor(instrument, r.label) }}
                >
                  {r.line}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChordTimelineView({
  result,
  instrument,
  readableBow = true,
}: {
  result: ArrangementResult;
  instrument: InstrumentDef;
  readableBow?: boolean;
}) {
  const sorted = [...result.chordChanges].sort(
    (a, b) => a.measureFrom - b.measureFrom || a.measureTo - b.measureTo,
  );
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#4a3226]">
        Full progression for <strong>{instrument.name}</strong> — scroll sideways on
        small screens.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-[#6b4f3b]">
          No chord symbols in this response — tab only below.
        </p>
      ) : (
        <div className="flex max-h-[50vh] flex-wrap gap-2 overflow-auto rounded-2xl border border-[#cfc4a8] bg-gradient-to-br from-[#faf5ec] to-[#f0e8d8] p-4 shadow-inner ring-1 ring-white/40">
          {sorted.map((c, i) => (
            <div
              key={`${c.symbol}-${c.measureFrom}-${i}`}
              className="min-w-[8rem] max-w-[11rem] rounded-xl border border-[#c9b896] bg-[#fffcf7] px-3 py-2.5 shadow-sm ring-1 ring-black/[0.03] transition hover:shadow-md"
            >
              <p className="font-mono text-[10px] text-[#6b4f3b]">
                m.{c.measureFrom}
                {c.measureTo !== c.measureFrom ? `–${c.measureTo}` : ""}
              </p>
              <p className="font-serif text-xl font-bold text-[#3b2418]">
                {c.symbol}
              </p>
              {c.voicing?.trim() && (
                <p className="mt-1 text-xs leading-snug text-[#4a3226]">
                  {c.voicing}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
      <ScoreSystemsList
        result={result}
        instrument={instrument}
        readableBow={readableBow}
        sheetLayout={false}
      />
    </div>
  );
}

export function LeadSheetView({
  result,
  instrument,
  readableBow = true,
}: {
  result: ArrangementResult;
  instrument: InstrumentDef;
  readableBow?: boolean;
}) {
  const sorted = [...result.chordChanges].sort(
    (a, b) => a.measureFrom - b.measureFrom,
  );
  return (
    <div className="space-y-6">
      {result.harmonyOverview?.trim() && (
        <div className="rounded-xl border border-[#c4a574] bg-white px-4 py-3 text-center">
          <p className="font-serif text-lg font-semibold text-[#3b2418]">
            {result.key} · {result.timeSignature} · {result.tempo}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-[#4a3226]">
            {result.harmonyOverview.trim()}
          </p>
        </div>
      )}
      {sorted.length > 0 && (
        <div className="columns-2 gap-4 text-sm md:columns-3">
          {sorted.map((c, i) => (
            <div
              key={i}
              className="mb-3 break-inside-avoid rounded-lg border border-[#d6bc9a] bg-[#fffdf8] px-3 py-2"
            >
              <span className="font-mono text-[10px] text-[#6b4f3b]">
                Bars {c.measureFrom}
                {c.measureTo !== c.measureFrom ? `–${c.measureTo}` : ""}
              </span>
              <p className="font-serif text-2xl font-bold text-[#5c3d2e]">
                {c.symbol}
              </p>
              {c.voicing?.trim() && (
                <p className="mt-1 text-xs text-[#4a3226]">{c.voicing}</p>
              )}
            </div>
          ))}
        </div>
      )}
      <div>
        <h3 className="mb-2 font-serif text-lg text-[#3b2418]">
          Tab — full piece
        </h3>
        <ScoreSystemsList
          result={result}
          instrument={instrument}
          readableBow={readableBow}
          sheetLayout={false}
        />
      </div>
    </div>
  );
}
