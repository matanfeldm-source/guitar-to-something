/** Pull a reasonable BPM from metadata like "♩= 88", "120 BPM", "q=72". */
export function parseBpm(tempo: string): number {
  const t = tempo.trim();
  const patterns = [
    /[=:]\s*(\d{2,3})\b/i,
    /\b(\d{2,3})\s*bpm\b/i,
    /^(\d{2,3})$/,
    /♩\s*=\s*(\d{2,3})/i,
    /quarter\s*=\s*(\d{2,3})/i,
  ];
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) {
      const n = Number.parseInt(m[1], 10);
      if (!Number.isNaN(n)) return Math.min(220, Math.max(40, n));
    }
  }
  return 88;
}

/** Top number of time signature "4/4" → beats per bar. */
export function parseBeatsPerBar(timeSignature: string): number {
  const m = /(\d+)\s*\/\s*(\d+)/.exec(timeSignature.trim());
  if (m) {
    const n = Number.parseInt(m[1], 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 4;
}
