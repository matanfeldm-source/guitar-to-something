"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import ArrangementResultPanel from "@/components/ArrangementResultPanel";
import { INSTRUMENTS } from "@/lib/instruments";
import { getFromLibrary } from "@/lib/libraryStorage";
import type { SavedArrangement } from "@/lib/libraryStorage";

export default function LibraryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [entry, setEntry] = useState<SavedArrangement | null | undefined>(undefined);
  const [readableBow, setReadableBow] = useState(true);

  useEffect(() => {
    setEntry(getFromLibrary(id));
  }, [id]);

  const instrument = useMemo(() => {
    if (!entry) return INSTRUMENTS.violin;
    return INSTRUMENTS[entry.instrumentId] ?? INSTRUMENTS.violin;
  }, [entry]);

  if (entry === undefined) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-[#4a3226]">
        Loading…
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-xl font-semibold text-[#2b1810]">Not found</h1>
        <p className="mt-2 text-sm text-[#4a3226]">
          This save is missing from localStorage (or the link is wrong).
        </p>
        <Link href="/library" className="mt-6 inline-block text-sm font-medium text-[#5c3d2e] underline">
          ← Library
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-5">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => router.push("/library")}
            className="text-sm font-medium text-[#5c3d2e] transition hover:text-[#3b2418] hover:underline"
          >
            ← Library
          </button>
          <h1 className="mt-3 font-serif text-2xl font-semibold tracking-tight text-[#2b1810] sm:text-3xl">
            {entry.title}
          </h1>
          <p className="mt-1 text-sm text-[#4a3226]">
            {entry.instrumentName}
            {entry.sourceLabel ? ` · ${entry.sourceLabel}` : ""}
          </p>
        </div>
      </div>
      <ArrangementResultPanel
        result={entry.arrangement}
        instrument={instrument}
        fromImage={entry.sourceLabel === "Photo"}
        readableBow={readableBow}
        onReadableBowChange={setReadableBow}
        extraToolbar={
          <>
            <Link
              href={`/library/${entry.id}/music`}
              className="rounded-xl bg-gradient-to-b from-[#335887] to-[#1d3557] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-[#3d6499] hover:to-[#243d5c] active:scale-[0.98]"
            >
              Music mode
            </Link>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-ghost rounded-xl text-sm"
            >
              Print / PDF
            </button>
          </>
        }
      />
    </div>
  );
}
