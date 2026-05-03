import type { InstrumentDef } from "./instruments";
import type { ArrangementStyleId } from "./instruments";

/** Builds the user message so the model always sees concrete target-instrument facts in-thread. */
export function buildArrangeUserMessage(
  instrument: InstrumentDef,
  style: ArrangementStyleId,
  sourceNotation: string,
  contextNotes?: string,
): string {
  const ctx = (contextNotes ?? "").trim();
  const header = [
    `TARGET_INSTRUMENT: ${instrument.name}`,
    `TUNING: ${instrument.tuningDescription}`,
    `TAB_ROW_LABELS_TOP_TO_BOTTOM (use exactly): ${instrument.stringLabels.join(", ")}`,
    `ARRANGEMENT_STYLE: ${style}`,
    "",
    "Keep melody contour and harmonic rhythm as close to the source as playable on this tuning.",
    "",
  ].join("\n");

  const body = ctx
    ? `${header}PLAYER_CONTEXT (capo, key, artist version, etc. — honor these):\n${ctx}\n\n==========\nSOURCE_NOTATION:\n${sourceNotation}\n\nProduce the complete JSON arrangement now.`
    : `${header}SOURCE_NOTATION:\n${sourceNotation}\n\nProduce the complete JSON arrangement now.`;

  return body;
}
