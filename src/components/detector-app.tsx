import { useMemo, useRef, useState } from "react";
import {
  FileText,
  ScanLine,
  Upload,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { analyzeDocument, type DetectResult } from "@/lib/analyze";
import { extractFromFile } from "@/lib/extract";
import {
  SAMPLE_AI,
  SAMPLE_HUMAN,
  computeFeatures,
  interpretFeatures,
  type TextStats,
} from "@/lib/features";
import { cn } from "@/lib/utils";

type Tab = "paste" | "upload";

export function DetectorApp() {
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [stats, setStats] = useState<TextStats | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const wordCount = useMemo(
    () => (text.match(/\b\w+\b/g) ?? []).length,
    [text],
  );

  async function onFile(file: File) {
    setError(null);
    setExtracting(true);
    setFileName(file.name);
    try {
      const extracted = await extractFromFile(file);
      if (!extracted) throw new Error("No readable text in that file.");
      setText(extracted);
      setTab("paste");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read file.");
    } finally {
      setExtracting(false);
    }
  }

  async function run() {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      setError("Need at least 20 characters to scan.");
      return;
    }
    setError(null);
    setBusy(true);
    setResult(null);
    const local = computeFeatures(trimmed);
    setStats(local);
    try {
      const response = await analyzeDocument({ data: { text: trimmed } });
      if (!response.ok) {
        setError(response.error);
      } else {
        setResult(response);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg text-fg">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-md border border-border bg-surface">
            <ScanLine className="size-4 text-accent" strokeWidth={1.75} />
          </span>
          <div>
            <p className="font-display text-lg font-semibold tracking-tight">Inktrace</p>
            <p className="text-xs text-muted">AI document detector</p>
          </div>
        </div>
        <p className="hidden text-right text-xs text-faint sm:block">Forensic signal, not proof</p>
      </header>

      <main className="mx-auto grid max-w-5xl gap-6 px-5 pb-20 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-xl border border-border bg-surface p-4 sm:p-6">
          <div className="mb-4 flex gap-1 rounded-md bg-raised p-1">
            {([["paste", "Paste text"], ["upload", "Upload file"]] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex-1 rounded-sm px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                  tab === id ? "bg-surface text-fg" : "text-muted hover:text-fg",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "paste" ? (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste an essay, report, email, or any prose…"
              className="min-h-64 w-full resize-y rounded-md border border-border bg-bg px-4 py-3 text-sm leading-relaxed text-fg outline-none placeholder:text-faint focus:border-accent"
            />
          ) : (
            <div
              className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-border bg-bg px-4 py-10 text-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void onFile(f);
              }}
            >
              <Upload className="mb-3 size-6 text-muted" strokeWidth={1.5} />
              <p className="text-sm text-fg">Drop a document here</p>
              <p className="mt-1 text-xs text-muted">.txt, .pdf, or .docx</p>
              <button
                type="button"
                className="mt-5 rounded-sm bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg"
                onClick={() => fileRef.current?.click()}
              >
                Choose file
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".txt,.pdf,.docx,text/plain,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void onFile(f);
                }}
              />
              {extracting && (
                <p className="mt-4 flex items-center gap-2 text-xs text-muted">
                  <Loader2 className="size-3.5 animate-spin" /> Reading {fileName}
                </p>
              )}
              {!extracting && fileName && (
                <p className="mt-4 flex items-center gap-2 text-xs text-muted">
                  <FileText className="size-3.5" /> {fileName}
                </p>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy || extracting}
              onClick={() => void run()}
              className="inline-flex min-h-11 items-center gap-2 rounded-sm bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              {busy ? "Scanning…" : "Scan document"}
            </button>
            <button
              type="button"
              className="min-h-11 rounded-sm border border-border px-3 py-2.5 text-xs text-muted hover:text-fg"
              onClick={() => {
                setText(SAMPLE_HUMAN);
                setTab("paste");
                setFileName(null);
              }}
            >
              Sample human
            </button>
            <button
              type="button"
              className="min-h-11 rounded-sm border border-border px-3 py-2.5 text-xs text-muted hover:text-fg"
              onClick={() => {
                setText(SAMPLE_AI);
                setTab("paste");
                setFileName(null);
              }}
            >
              Sample AI
            </button>
            <span className="ml-auto font-mono text-xs tabular-nums text-faint">{wordCount} words</span>
          </div>
          {error && (
            <p className="mt-3 flex items-start gap-2 text-sm text-ai">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
        </section>

        <aside className="flex flex-col gap-4">
          <ResultPanel result={result} stats={stats} busy={busy} />
        </aside>
      </main>
    </div>
  );
}

function ResultPanel({
  result,
  stats,
  busy,
}: {
  result: DetectResult | null;
  stats: TextStats | null;
  busy: boolean;
}) {
  if (busy) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-display text-xl">Reading the grain…</p>
        <p className="mt-2 text-sm text-muted">Comparing rhythm, diction, and structure.</p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-raised">
          <div className="h-full w-1/2 animate-pulse bg-accent" />
        </div>
      </div>
    );
  }

  if (!result && !stats) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="font-display text-xl tracking-tight">Awaiting a scan</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Paste text or drop a file. Inktrace combines a statistical fingerprint with a Grok forensic pass.
          Treat the score as evidence, not a verdict in court.
        </p>
      </div>
    );
  }

  const insights = stats ? interpretFeatures(stats) : [];
  const verdict = result?.verdict ?? "UNKNOWN";
  const ai = result?.aiProbability ?? 0.5;
  const human = 1 - ai;

  return (
    <>
      <div className="rounded-xl border border-border bg-surface p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">Verdict</p>
        <p
          className={cn(
            "mt-2 font-display text-3xl font-semibold tracking-tight",
            verdict === "AI" && "text-ai",
            verdict === "HUMAN" && "text-human",
            verdict === "MIXED" && "text-mixed",
          )}
        >
          {verdict === "AI"
            ? "Likely AI"
            : verdict === "HUMAN"
              ? "Likely human"
              : verdict === "MIXED"
                ? "Mixed signals"
                : "Inconclusive"}
        </p>
        {result && (
          <p className="mt-2 text-sm text-muted">Confidence {(result.confidence * 100).toFixed(0)}%</p>
        )}
        <div className="mt-5 space-y-2">
          <Bar label="AI" value={ai} className="bg-ai" />
          <Bar label="Human" value={human} className="bg-human" />
        </div>
        {result?.rationale && (
          <p className="mt-5 text-sm leading-relaxed text-fg/90">{result.rationale}</p>
        )}
      </div>

      {stats && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Fingerprint</p>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Words" value={String(Math.round(stats.wordCount))} />
            <Stat label="Sentences" value={String(Math.round(stats.sentenceCount))} />
            <Stat label="Avg length" value={stats.avgSentenceLength.toFixed(1)} />
            <Stat label="Burstiness" value={stats.burstiness.toFixed(2)} />
            <Stat label="TTR" value={stats.typeTokenRatio.toFixed(3)} />
            <Stat label="Word size" value={stats.avgWordLength.toFixed(2)} />
          </dl>
          {insights.length > 0 && (
            <ul className="mt-4 space-y-2">
              {insights.map((i) => (
                <li key={i.text} className="text-xs leading-relaxed text-muted">
                  {i.text}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {result?.signals && result.signals.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Signals</p>
          <ul className="mt-3 space-y-2">
            {result.signals.map((s) => (
              <li key={s} className="text-sm leading-relaxed text-fg/90">
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {result?.sentences && result.sentences.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted">Sentence grain</p>
          <ul className="mt-3 space-y-3">
            {result.sentences.map((s, i) => (
              <li key={`${i}-${s.excerpt.slice(0, 24)}`}>
                <p className="font-mono text-xs tabular-nums text-muted">
                  {(s.aiProbability * 100).toFixed(0)}% AI
                </p>
                <p className="mt-0.5 text-sm leading-relaxed text-fg/85">{s.excerpt}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function Bar({
  label,
  value,
  className,
}: {
  label: string;
  value: number;
  className: string;
}) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted">
        <span>{label}</span>
        <span className="font-mono tabular-nums">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-raised">
        <div className={cn("h-full rounded-full", className)} style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-raised px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-faint">{label}</dt>
      <dd className="font-mono text-sm tabular-nums">{value}</dd>
    </div>
  );
}
