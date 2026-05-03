import { NextResponse } from "next/server";
import { INSTRUMENTS, ARRANGEMENT_STYLES, type ArrangementStyleId } from "@/lib/instruments";
import { buildArrangeUserMessage } from "@/lib/arrangeUserMessage";
import { generateGeminiJson } from "@/lib/geminiGenerate";
import { arrangeSystemPrompt, ocrSystemPrompt } from "@/lib/prompts";
import { coerceArrangement, coerceOcr, parseJsonSafe } from "@/lib/parseResult";

export const runtime = "nodejs";

type BodyOcr = {
  mode: "ocr";
  imageBase64: string;
  mediaType: string;
};

type BodyArrange = {
  mode: "arrange";
  input: string;
  instrumentId: string;
  style: ArrangementStyleId;
  contextNotes?: string;
};

function isArrangementStyle(s: string): s is ArrangementStyleId {
  return ARRANGEMENT_STYLES.some((x) => x.id === s);
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "Missing GEMINI_API_KEY. Create guitar-arranger/.env.local with your key from Google AI Studio (see .env.example).",
      },
      { status: 500 },
    );
  }

  let body: BodyOcr | BodyArrange;
  try {
    body = (await req.json()) as BodyOcr | BodyArrange;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body.mode === "ocr") {
    const { imageBase64, mediaType } = body;
    if (!imageBase64 || !mediaType || !mediaType.startsWith("image/")) {
      return NextResponse.json({ error: "ocr requires imageBase64 and image/* mediaType." }, { status: 400 });
    }

    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const mt = allowed.includes(mediaType) ? mediaType : "image/png";

    try {
      const text = await generateGeminiJson({
        apiKey: key,
        systemInstruction: ocrSystemPrompt(),
        userParts: [
          {
            inlineData: {
              mimeType: mt,
              data: imageBase64,
            },
          },
          {
            text: 'Transcribe all readable musical notation from this image into a single JSON object matching the schema in your instructions. Output only valid JSON.',
          },
        ],
        maxOutputTokens: 8192,
        temperature: 0.15,
      });

      const parsed = parseJsonSafe(text);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: "Could not parse model JSON for OCR.",
            parseError: parsed.error,
            truncated: parsed.truncated,
            rawText: text,
          },
          { status: 422 },
        );
      }
      const ocr = coerceOcr(parsed.value);
      if (!ocr) {
        return NextResponse.json(
          {
            error: "OCR response shape unexpected.",
            rawText: text,
            parseError: "coerceOcr failed",
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ ocr, rawText: text });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Gemini request failed: ${message}` }, { status: 502 });
    }
  }

  if (body.mode === "arrange") {
    const input = (body.input ?? "").trim();
    if (input.length < 4) {
      return NextResponse.json({ error: "Input too short to arrange meaningfully." }, { status: 400 });
    }

    const instrument = INSTRUMENTS[body.instrumentId];
    if (!instrument) {
      return NextResponse.json({ error: `Unknown instrument: ${body.instrumentId}` }, { status: 400 });
    }

    const style = body.style;
    if (!isArrangementStyle(style)) {
      return NextResponse.json({ error: "Invalid arrangement style." }, { status: 400 });
    }

    const contextNotes =
      typeof body.contextNotes === "string" ? body.contextNotes.trim() : "";
    const userText = buildArrangeUserMessage(
      instrument,
      style,
      input,
      contextNotes || undefined,
    );

    const rawMax = process.env.GEMINI_MAX_OUTPUT_TOKENS?.trim();
    let maxArrange = 32768;
    if (rawMax) {
      const n = Number.parseInt(rawMax, 10);
      if (!Number.isNaN(n) && n >= 4096) maxArrange = Math.min(65536, n);
    }

    try {
      const text = await generateGeminiJson({
        apiKey: key,
        systemInstruction: arrangeSystemPrompt(instrument, style),
        userParts: [{ text: userText }],
        maxOutputTokens: maxArrange,
        temperature: 0.25,
      });

      const parsed = parseJsonSafe(text);
      if (!parsed.ok) {
        return NextResponse.json(
          {
            error: "Arrangement JSON could not be parsed; see rawText.",
            parseError: parsed.error,
            truncated: parsed.truncated,
            rawText: text,
            partial: null,
          },
          { status: 422 },
        );
      }
      const arrangement = coerceArrangement(parsed.value);
      if (!arrangement || arrangement.systems.length === 0) {
        return NextResponse.json(
          {
            error: "Arrangement missing systems; see rawText.",
            rawText: text,
            partial: coerceArrangement(parsed.value),
          },
          { status: 422 },
        );
      }
      return NextResponse.json({ arrangement, rawText: text });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: `Gemini request failed: ${message}` }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Unknown mode." }, { status: 400 });
}
