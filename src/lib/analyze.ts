import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  text: z.string().min(20).max(12000),
});

export type DetectResult = {
  ok: true;
  verdict: "AI" | "HUMAN" | "MIXED" | "UNKNOWN";
  aiProbability: number;
  confidence: number;
  rationale: string;
  signals: string[];
  sentences: { excerpt: string; aiProbability: number }[];
};

export type DetectError = { ok: false; error: string };

export const analyzeDocument = createServerFn({ method: "POST" })
  .validator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<DetectResult | DetectError> => {
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) {
      return { ok: false, error: "AI analysis is unavailable. Set XAI_API_KEY." };
    }

    const truncated =
      data.text.length > 8000 ? `${data.text.slice(0, 8000)}\n\n[truncated]` : data.text;

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "grok-4.5",
        temperature: 0.2,
        max_tokens: 700,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a forensic writing analyst. Classify whether English text is AI-generated or human-written.
Return JSON only:
{
  "verdict": "AI" | "HUMAN" | "MIXED" | "UNKNOWN",
  "aiProbability": number 0-1,
  "confidence": number 0-1,
  "rationale": string (2-4 sentences, plain, no hype),
  "signals": string[] (3-6 short evidence bullets),
  "sentences": [{ "excerpt": string, "aiProbability": number }]  (up to 8 notable sentences)
}
Be conservative. Formal human writing is not automatically AI. Never claim certainty.`,
          },
          { role: "user", content: truncated },
        ],
      }),
    });

    if (!res.ok) {
      return { ok: false, error: `Analysis failed (${res.status}). Try again.` };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = body.choices?.[0]?.message?.content ?? "";
    try {
      const parsed = JSON.parse(raw) as Partial<DetectResult>;
      const aiProbability = clamp01(Number(parsed.aiProbability));
      const confidence = clamp01(Number(parsed.confidence));
      const verdict = normalizeVerdict(parsed.verdict, aiProbability);
      return {
        ok: true,
        verdict,
        aiProbability,
        confidence,
        rationale: String(parsed.rationale ?? "No rationale returned."),
        signals: Array.isArray(parsed.signals)
          ? parsed.signals.map(String).slice(0, 8)
          : [],
        sentences: Array.isArray(parsed.sentences)
          ? parsed.sentences
              .slice(0, 10)
              .map((s) => ({
                excerpt: String((s as { excerpt?: string }).excerpt ?? "").slice(0, 280),
                aiProbability: clamp01(
                  Number((s as { aiProbability?: number }).aiProbability),
                ),
              }))
              .filter((s) => s.excerpt.length > 0)
          : [],
      };
    } catch {
      return { ok: false, error: "Could not parse the model response." };
    }
  });

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0.5;
  return Math.min(1, Math.max(0, n));
}

function normalizeVerdict(
  v: unknown,
  ai: number,
): DetectResult["verdict"] {
  const s = String(v ?? "").toUpperCase();
  if (s === "AI" || s === "HUMAN" || s === "MIXED" || s === "UNKNOWN") return s;
  if (ai >= 0.65) return "AI";
  if (ai <= 0.35) return "HUMAN";
  return "MIXED";
}
