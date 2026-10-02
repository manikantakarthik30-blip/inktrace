export type TextStats = {
  wordCount: number;
  charCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  burstiness: number;
  typeTokenRatio: number;
  avgWordLength: number;
  punctuationRatio: number;
};

export type Insight = { tone: "ai" | "human" | "neutral"; text: string };

export function splitSentences(text: string): string[] {
  const prepared = text.replace(
    /\b(Mr|Mrs|Ms|Dr|Prof|Inc|Ltd|etc|vs|e\.g|i\.e)\.\s/g,
    "$1<ABBR> ",
  );
  return prepared
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/<ABBR>/g, ".").trim())
    .filter(Boolean);
}

function burstiness(lengths: number[]): number {
  if (lengths.length < 2) return 0;
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  if (mean === 0) return 0;
  const variance =
    lengths.reduce((acc, n) => acc + (n - mean) ** 2, 0) / lengths.length;
  return variance / mean;
}

export function computeFeatures(text: string): TextStats {
  const sentences = splitSentences(text);
  const lengths = sentences.map((s) => s.split(/\s+/).filter(Boolean).length);
  const words = text.match(/\b\w+\b/g) ?? [];
  const unique = new Set(words.map((w) => w.toLowerCase()));
  const punct = [...text].filter((c) => ". ,;:!?\"'()[]{}".includes(c)).length;

  return {
    wordCount: words.length,
    charCount: text.length,
    sentenceCount: sentences.length,
    avgSentenceLength: lengths.length
      ? lengths.reduce((a, b) => a + b, 0) / lengths.length
      : 0,
    burstiness: burstiness(lengths),
    typeTokenRatio: words.length ? unique.size / words.length : 0,
    avgWordLength: words.length
      ? words.reduce((a, w) => a + w.length, 0) / words.length
      : 0,
    punctuationRatio: text.length ? punct / text.length : 0,
  };
}

export function interpretFeatures(stats: TextStats): Insight[] {
  const out: Insight[] = [];
  if (stats.burstiness < 2) {
    out.push({
      tone: "ai",
      text: `Low burstiness (${stats.burstiness.toFixed(2)}) — sentence lengths are unusually even.`,
    });
  } else if (stats.burstiness > 8) {
    out.push({
      tone: "human",
      text: `High burstiness (${stats.burstiness.toFixed(2)}) — sentence rhythm varies like natural writing.`,
    });
  }
  if (stats.typeTokenRatio < 0.45 && stats.wordCount > 100) {
    out.push({
      tone: "ai",
      text: `Low lexical diversity (TTR ${stats.typeTokenRatio.toFixed(3)}) — phrasing may be repetitive.`,
    });
  } else if (stats.typeTokenRatio > 0.7) {
    out.push({
      tone: "human",
      text: `High lexical diversity (TTR ${stats.typeTokenRatio.toFixed(3)}).`,
    });
  }
  if (stats.avgSentenceLength >= 15 && stats.avgSentenceLength <= 25) {
    out.push({
      tone: "neutral",
      text: `Average sentence length is ${stats.avgSentenceLength.toFixed(1)} words — common in both human and AI prose.`,
    });
  }
  return out;
}

export const SAMPLE_HUMAN = `The old oak tree stood at the edge of the meadow, its branches twisted by decades of wind. I used to climb it every summer when I was a kid. My grandmother would pack sandwiches and we'd sit up there for hours, watching clouds drift over the valley. She always said the best stories come from quiet places. I didn't understand what she meant until years later, after she was gone. Now, whenever I visit the property, I still look up at that tree and half-expect to see her waving from the highest branch.`;

export const SAMPLE_AI = `In today's rapidly evolving digital landscape, artificial intelligence has emerged as a transformative force reshaping industries across the globe. Organizations are increasingly leveraging advanced machine learning algorithms to optimize operational efficiency, enhance customer experiences, and drive data-informed decision-making. By harnessing the power of large language models and neural networks, businesses can unlock unprecedented levels of productivity and innovation. It is important to note that the successful integration of AI technologies requires careful consideration of ethical implications, data privacy concerns, and the need for robust governance frameworks. Moving forward, stakeholders must collaborate to ensure that AI continues to serve as a catalyst for positive societal impact.`;
