import { logError } from "@/lib/error-log";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const SYSTEM_PROMPT = `You are a Formula 1 race control message translator.
Translate the given English F1 race control messages to Turkish.
Rules:
- Keep car numbers and driver codes as-is (e.g. "CAR 44", "VER")
- Keep proper nouns (team names, circuit names) in English
- Use official F1 Turkish terminology where applicable
- Return ONLY a JSON array of translated strings, same order as input
- No explanations, no markdown, just the JSON array`;

// Returns empty array on failure so callers can detect and retry later.
export async function translateRaceControlMessages(messages: string[]): Promise<string[]> {
  if (!GEMINI_API_KEY || !messages.length) return [];

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify(messages) }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logError({ source: "gemini/translate", severity: "error", message: `${res.status} ${res.statusText} (model: ${GEMINI_MODEL})`, context: { errText } });
      return [];
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "[]";
    const translated: unknown = JSON.parse(text);

    if (
      Array.isArray(translated) &&
      translated.length === messages.length &&
      translated.every((t) => typeof t === "string")
    ) {
      return translated as string[];
    }

    logError({ source: "gemini/translate", severity: "warning", message: "Unexpected response shape", context: { text } });
    return [];
  } catch (err) {
    logError({ source: "gemini/translate", severity: "error", message: err instanceof Error ? err.message : String(err) });
    return [];
  }
}

const CIRCUIT_HISTORY_SYSTEM_PROMPT = `You are a motorsport historian writing engaging circuit history summaries for a Formula 1 companion app.
Given raw reference text about a circuit (from Wikipedia and/or f1-circuits.com), write an engaging 2-3 paragraph summary (200-300 words) covering its construction/origin story, notable events, and current status.
Rules:
- Avoid generic filler — highlight concrete facts: names, years, records, incidents.
- Do not invent facts not present in the source text.
- Do not include URLs or links in the text.
- Do not use em dashes (—) anywhere in the summaries. Use commas, periods, or parentheses instead.
- Return ONLY a JSON object: {"en": "English summary", "tr": "Turkish summary"}
- Both summaries must independently read well in their own language — not a literal translation of each other.
- No explanations, no markdown, just the JSON object.`;

export async function summarizeCircuitHistory(
  circuitName: string,
  rawText: string
): Promise<{ tr: string; en: string } | null> {
  if (!GEMINI_API_KEY || !rawText.trim()) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const body = {
      system_instruction: { parts: [{ text: CIRCUIT_HISTORY_SYSTEM_PROMPT }] },
      contents: [
        {
          role: "user",
          parts: [{ text: JSON.stringify({ circuitName, sourceText: rawText }) }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        responseMimeType: "application/json",
      },
    };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      logError({ source: "gemini/circuit-history", severity: "error", message: `${res.status} ${res.statusText} (circuit: ${circuitName})`, context: { errText } });
      return null;
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    const parsed: unknown = JSON.parse(text);

    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as Record<string, unknown>).en === "string" &&
      typeof (parsed as Record<string, unknown>).tr === "string"
    ) {
      return parsed as { en: string; tr: string };
    }

    logError({ source: "gemini/circuit-history", severity: "warning", message: "Unexpected response shape", context: { text } });
    return null;
  } catch (err) {
    logError({ source: "gemini/circuit-history", severity: "error", message: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
