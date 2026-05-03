/** Heuristic: pasted source probably had chord symbols (for empty chordChanges warning). */
export function inputLooksChordRich(s: string): boolean {
  const t = s.trim();
  if (t.length < 6) return false;
  const sym = t.match(
    /\b[A-G][#b]?(m|maj|min|dim|aug|sus|add|m7|maj7|7|9|11|13)?[0-9]*(\/[A-G][#b]?)?\b/g,
  );
  if (sym && sym.length >= 2) return true;
  if (/\[[A-G][#b]?(m|maj|7|dim|sus)?\]/.test(t)) return true;
  if (/^chords?:/im.test(t)) return true;
  const tabLines = t
    .split(/\n/)
    .filter((line) => /^[eEbBgGdDaA]\s*[|]/.test(line.trim()));
  if (tabLines.length >= 2) {
    const withNums = tabLines.filter((line) => /\d/.test(line));
    if (withNums.length >= 2) return true;
  }
  return false;
}
