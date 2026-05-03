/**
 * Turn a width-padded bow line into short per-bar hints (easier to read at a glance).
 */
export function formatBowReadable(bowLine: string): string {
  return bowLine
    .split("|")
    .map((chunk) =>
      chunk
        .replace(/-+/g, " ")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter((s) => s.length > 0)
    .join("  │  ");
}
