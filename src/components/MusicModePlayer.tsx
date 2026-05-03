"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ArrangementResult } from "@/lib/parseResult";
import {
  enrichSegmentsWithChords,
  parseLeadSheetFromSource,
  segmentsFromArrangement,
  type LeadSegment,
} from "@/lib/lyricsChordParse";
import { parseBeatsPerBar, parseBpm } from "@/lib/tempoParse";

type Props = {
  title: string;
  arrangement: ArrangementResult;
  sourceText?: string;
  backHref: string;
  instrumentLabel: string;
};

function msToSegmentOffset(
  playheadMs: number,
  durationsMs: number[],
): { index: number; withinMs: number } {
  if (durationsMs.length === 0) return { index: 0, withinMs: 0 };
  let acc = 0;
  for (let i = 0; i < durationsMs.length; i++) {
    const d = durationsMs[i];
    if (playheadMs < acc + d) {
      return { index: i, withinMs: playheadMs - acc };
    }
    acc += d;
  }
  const last = durationsMs.length - 1;
  return { index: last, withinMs: durationsMs[last] };
}

export default function MusicModePlayer({
  title,
  arrangement,
  sourceText,
  backHref,
  instrumentLabel,
}: Props) {
  const segments: LeadSegment[] = useMemo(() => {
    const raw = (sourceText ?? "").trim();
    const fromSource = raw ? parseLeadSheetFromSource(raw) : [];
    let base: LeadSegment[];
    if (fromSource.length > 0) {
      base = enrichSegmentsWithChords(fromSource, arrangement);
    } else {
      base = segmentsFromArrangement(arrangement);
    }
    return base.length > 0 ? base : segmentsFromArrangement(arrangement);
  }, [arrangement, sourceText]);

  const bpmBase = useMemo(() => parseBpm(arrangement.tempo), [arrangement.tempo]);
  const beatsPerBar = useMemo(
    () => parseBeatsPerBar(arrangement.timeSignature),
    [arrangement.timeSignature],
  );

  const [speed, setSpeed] = useState(1);
  const bpm = bpmBase * speed;
  const secPerBeat = 60 / bpm;
  const secPerMeasure = secPerBeat * beatsPerBar;

  const durationsMs = useMemo(
    () => segments.map((s) => Math.round(s.measures * secPerMeasure * 1000)),
    [segments, secPerMeasure],
  );

  const totalMs = useMemo(() => durationsMs.reduce((a, b) => a + b, 0), [durationsMs]);

  const [playing, setPlaying] = useState(false);
  const [playheadMs, setPlayheadMs] = useState(0);

  const { index, withinMs } = useMemo(
    () => msToSegmentOffset(playheadMs, durationsMs),
    [playheadMs, durationsMs],
  );

  const current = segments[Math.min(index, segments.length - 1)] ?? segments[0];
  const nextSeg = segments[Math.min(index + 1, segments.length - 1)];

  const seekChordDetail = useMemo(() => {
    if (!current?.chords[0]) return null;
    const sym = current.chords[0];
    return (
      arrangement.chordChanges.find((c) => c.symbol === sym) ??
      arrangement.chordChanges.find(
        (c) =>
          c.symbol.replace(/m7|maj7|7|9/g, "") === sym.replace(/m7|maj7|7|9/g, ""),
      )
    );
  }, [arrangement.chordChanges, current]);

  useEffect(() => {
    setPlayheadMs(0);
  }, [speed, durationsMs]);

  useEffect(() => {
    if (!playing || totalMs <= 0) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      setPlayheadMs((ph) => {
        const next = ph + dt;
        if (next >= totalMs) {
          setPlaying(false);
          return totalMs;
        }
        return next;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, totalMs]);

  const progress = totalMs > 0 ? playheadMs / totalMs : 0;
  const dur = durationsMs[index] ?? 1;
  const barPct = dur > 0 ? Math.min(100, (withinMs / dur) * 100) : 0;

  const restart = useCallback(() => {
    setPlaying(true);
    setPlayheadMs(0);
  }, []);

  const stepSeg = useCallback(
    (delta: number) => {
      setPlaying(false);
      setPlayheadMs((ph) => {
        const { index: i } = msToSegmentOffset(ph, durationsMs);
        const ni = Math.max(0, Math.min(segments.length - 1, i + delta));
        let acc = 0;
        for (let k = 0; k < ni; k++) acc += durationsMs[k] ?? 0;
        return acc;
      });
    },
    [durationsMs, segments.length],
  );

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-[#0c0f14] text-[#f8fafc]">
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-90"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(217, 119, 6, 0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 60%, rgba(59, 130, 246, 0.08), transparent), linear-gradient(165deg, #141820 0%, #0a0e14 45%, #06080c 100%)",
        }}
      />
      <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-black/25 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-md">
        <Link
          href={backHref}
          className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white/95 shadow-sm transition hover:bg-white/12 active:scale-[0.98]"
        >
          ← Back
        </Link>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate font-serif text-sm font-semibold text-amber-100/90">{title}</p>
          <p className="truncate text-[11px] text-slate-400">
            {arrangement.key} · {arrangement.timeSignature} · {arrangement.tempo} · {instrumentLabel}
          </p>
        </div>
        <span className="w-12 shrink-0 text-right text-[10px] font-mono tabular-nums text-slate-500">
          {index + 1}/{segments.length}
        </span>
      </div>

      <div className="relative z-10 flex min-h-[36vh] shrink-0 flex-col justify-center px-4 pt-4">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-200/70">
          Chords
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {current?.chords?.length ? (
            current.chords.map((c) => (
              <span
                key={`${index}-${c}`}
                className="rounded-2xl border border-amber-400/35 bg-gradient-to-b from-amber-950/50 to-amber-950/30 px-5 py-3.5 font-serif text-3xl font-bold tracking-tight text-amber-50 shadow-[0_8px_32px_-8px_rgba(245,158,11,0.35)] ring-1 ring-amber-500/20 sm:text-4xl"
              >
                {c}
              </span>
            ))
          ) : (
            <span className="text-xl text-slate-500">—</span>
          )}
        </div>
        {seekChordDetail?.voicing?.trim() && (
          <p className="mx-auto mt-4 max-w-lg text-center text-sm leading-relaxed text-slate-300">
            {seekChordDetail.voicing.trim()}
          </p>
        )}
        {index < segments.length - 1 && nextSeg && (
          <p className="mx-auto mt-4 text-center text-xs text-slate-500">
            Next:{" "}
            <span className="font-semibold text-slate-400">
              {nextSeg.chords.length ? nextSeg.chords.join(" · ") : "—"}
            </span>
            {nextSeg.lyric && nextSeg.lyric !== "·" ? (
              <span className="mt-1 block px-2 opacity-90">
                {nextSeg.lyric.length > 48
                  ? `“${nextSeg.lyric.slice(0, 48)}…”`
                  : `“${nextSeg.lyric}”`}
              </span>
            ) : null}
          </p>
        )}
      </div>

      <div className="relative z-10 mt-4 px-4">
        <div className="h-2.5 overflow-hidden rounded-full bg-white/10 shadow-inner ring-1 ring-white/5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-500 transition-[width] duration-75 ease-linear shadow-[0_0_12px_rgba(251,191,36,0.4)]"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-slate-500">
          <span>Song</span>
          <span>Line {Math.round(barPct)}%</span>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-center px-4 pb-8 pt-6">
        <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Words
        </p>
        <p className="mx-auto max-w-2xl text-center font-serif text-2xl leading-snug text-slate-100 sm:text-3xl">
          {current?.lyric ?? "·"}
        </p>
        <p className="mx-auto mt-6 max-w-md text-center text-xs text-slate-500">
          Tip: save from a lyrics + chords paste so words appear here. Otherwise lines follow your
          chord chart bars.
        </p>
      </div>

      <div className="relative z-10 shrink-0 border-t border-white/10 bg-black/30 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <label className="flex items-center gap-3 text-xs text-slate-400">
            <span className="w-14 shrink-0">Speed</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.05}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="h-2 flex-1 accent-amber-500"
            />
            <span className="w-10 font-mono text-slate-300">{speed.toFixed(2)}×</span>
          </label>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => stepSeg(-1)}
              disabled={index === 0 && withinMs < 1}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm transition hover:bg-white/10 disabled:opacity-35"
            >
              Prev
            </button>
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-2xl bg-gradient-to-b from-amber-400 to-amber-600 px-10 py-3.5 text-base font-semibold text-[#1a0f08] shadow-[0_8px_28px_-4px_rgba(245,158,11,0.45)] transition hover:from-amber-300 hover:to-amber-500 active:scale-[0.98]"
            >
              {playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => stepSeg(1)}
              disabled={index >= segments.length - 1}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm transition hover:bg-white/10 disabled:opacity-35"
            >
              Next
            </button>
            <button
              type="button"
              onClick={restart}
              className="rounded-xl border border-amber-500/40 bg-amber-950/30 px-4 py-2.5 text-sm font-medium text-amber-100 transition hover:bg-amber-950/50"
            >
              From top
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
