"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import MusicModePlayer from "@/components/MusicModePlayer";
import { getFromLibrary } from "@/lib/libraryStorage";
import type { SavedArrangement } from "@/lib/libraryStorage";

export default function LibraryMusicPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [entry, setEntry] = useState<SavedArrangement | null | undefined>(undefined);

  useEffect(() => {
    setEntry(getFromLibrary(id));
  }, [id]);

  if (entry === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#4a3226]">
        Loading…
      </div>
    );
  }

  if (entry === null) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="font-medium text-[#2b1810]">Save not found.</p>
        <a href="/library" className="mt-4 inline-block text-sm text-[#5c3d2e] underline">
          Back to library
        </a>
      </div>
    );
  }

  return (
    <MusicModePlayer
      title={entry.title}
      arrangement={entry.arrangement}
      sourceText={entry.sourceText}
      backHref={`/library/${entry.id}`}
      instrumentLabel={entry.instrumentName}
    />
  );
}
