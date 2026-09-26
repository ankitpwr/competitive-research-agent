import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  ArrowUp,
  BarChart3,
  Check,
  CircleStop,
  LoaderCircle,
  Radio,
  Search,
  Sparkles,
  TriangleAlert,
  Terminal,
} from "lucide-react";
import "./App.css";

type Activity = {
  id: number;
  mode: string;
  label: string;
  source?: "node" | "subagent" | "tool";
  phase?: "start" | "complete";
  detail?: string;
};

const STREAM_MODES = new Set(["updates", "custom", "messages", "tools"]);

function findString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = findString(item, key);
      if (result) return result;
    }
    return undefined;
  }

  const record = value as Record<string, unknown>;
  if (typeof record[key] === "string") return record[key];
  for (const item of Object.values(record)) {
    const result = findString(item, key);
    if (result) return result;
  }
  return undefined;
}

function unpackEvent(value: unknown): { mode: string; payload: unknown } {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length - 1; index += 1) {
      if (typeof value[index] === "string" && STREAM_MODES.has(value[index])) {
        return { mode: value[index], payload: value[index + 1] };
      }
    }
    const nested = value.at(-1);
    if (nested && nested !== value) return unpackEvent(nested);
  }
  return { mode: "updates", payload: value };
}

function describeEvent(value: unknown, mode: string): Activity | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const activity = value as Record<string, unknown>;
    if (
      activity.type === "activity" &&
      typeof activity.label === "string" &&
      (activity.source === "node" ||
        activity.source === "subagent" ||
        activity.source === "tool")
    ) {
      return {
        id: Date.now(),
        mode,
        label: activity.label,
        source: activity.source,
        phase: activity.phase === "complete" ? "complete" : "start",
      };
    }
  }

  const status = findString(value, "status");
  const finalSummary = findString(value, "finalSummary");
  const detail =
    status ?? (finalSummary ? "Synthesis is ready to review." : undefined);

  if (status && !status.toLowerCase().includes("success")) {
    return { id: Date.now(), mode, label: status };
  }
  if (finalSummary)
    return { id: Date.now(), mode, label: "Final synthesis ready", detail };

  return null;
}

async function readStream(
  response: Response,
  onEvent: (event: unknown) => void,
) {
  if (!response.body) throw new Error("The server returned an empty stream.");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const data = frame
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6);
      if (data && data !== "{}") onEvent(JSON.parse(data));
    }
    if (done) break;
  }
}

function App() {
  const [company, setCompany] = useState("");
  const [activeCompany, setActiveCompany] = useState("");
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [summary, setSummary] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const companyName = company.trim();
    if (!companyName || isRunning) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setActiveCompany(companyName);
    setCurrentActivity(null);
    setSummary("");
    setError("");
    setIsRunning(true);

    try {
      const response = await fetch(
        "http://localhost:3000/competitive-analysis",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyName }),
          signal: controller.signal,
        },
      );
      if (!response.ok) throw new Error("Unable to start the research run.");

      await readStream(response, (rawEvent) => {
        const { mode, payload } = unpackEvent(rawEvent);
        const finalSummary = findString(payload, "finalSummary");
        if (finalSummary) setSummary(finalSummary);
        const nextActivity = describeEvent(payload, mode);
        if (nextActivity) {
          setCurrentActivity((current) =>
            current?.label === nextActivity.label ? current : nextActivity,
          );
        }
      });
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      )
        return;
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something went wrong.",
      );
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setIsRunning(false);
      }
    }
  }

  function stopRun() {
    abortRef.current?.abort();
    setIsRunning(false);
  }

  return (
    <main className="app-shell">
      <div className="ambient-grid" aria-hidden="true" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <BarChart3 size={18} strokeWidth={2.4} />
          </div>
          <span>signal / research</span>
        </div>
        <div className="live-indicator">
          <span /> LIVE AGENT
        </div>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkles size={14} /> Competitive intelligence, in motion
          </p>
          <h1>
            See the market
            <br />
            <em>take shape.</em>
          </h1>
          <p className="hero-description">
            A focused research brief on any company, assembled from live market
            signals, peers, and business context.
          </p>
        </div>

        <form className="research-form" onSubmit={handleSubmit}>
          <div className="field-label">
            <span>Company to research</span>
            <span className="field-hint">ENTER TO RUN</span>
          </div>
          <div className="input-wrap">
            <Search size={19} />
            <input
              value={company}
              onChange={(event) => setCompany(event.target.value)}
              placeholder="e.g. Infosys, Reliance Industries"
              aria-label="Company name"
              autoFocus
            />
            <button
              type="submit"
              disabled={!company.trim() || isRunning}
              aria-label="Start research"
            >
              {isRunning ? (
                <LoaderCircle size={19} className="spin" />
              ) : (
                <ArrowUp size={19} />
              )}
            </button>
          </div>
          <div className="form-footer">
            <span>Powered by live web and financial data</span>
            <span>⌘ ↵</span>
          </div>
        </form>
      </section>

      <section className="workspace" aria-live="polite">
        <div className="section-heading">
          <div>
            <span className="section-kicker">01 / LIVE RESPONSE</span>
            <h2>
              {activeCompany
                ? `Researching ${activeCompany}`
                : "Your research trace"}
            </h2>
          </div>
          {isRunning && (
            <button className="stop-button" onClick={stopRun}>
              <CircleStop size={15} /> Stop run
            </button>
          )}
        </div>

        <article className="response-panel">
          {/* Thinking / Streaming Status */}
          {isRunning && currentActivity && !summary && (
            <div
              className="response-thinking-container"
              key={currentActivity.id}
            >
              <div className="thinking-header">
                <Terminal size={14} className="thinking-icon" />
                <span>Agent Processing...</span>
                <span className="streaming-live-label">
                  <span /> LIVE
                </span>
              </div>
              <div className="streaming-status">
                <div className="streaming-status-topline">
                  <div className={`activity-icon is-active`}>
                    <LoaderCircle size={15} className="spin" />
                  </div>
                  <div className="activity-content">
                    <span className="activity-label">
                      {currentActivity.label}
                    </span>
                    <span className="activity-meta">
                      {currentActivity.source ?? currentActivity.mode} / IN
                      PROGRESS
                    </span>
                  </div>
                </div>
                <div className="streaming-track" aria-hidden="true">
                  <span className="streaming-track-fill" />
                </div>
                <p className="streaming-caption">
                  Gathering real-time market data and synthesizing context.
                </p>
              </div>
            </div>
          )}

          {/* Final Summary / Markdown */}
          {summary ? (
            <div className="summary-container">
              <div className="summary-topline">
                <span className="section-kicker">02 / SYNTHESIS</span>
                <span className="ready-badge">
                  <Check size={14} /> COMPLETE
                </span>
              </div>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary}
                </ReactMarkdown>
              </div>
            </div>
          ) : error ? (
            <div className="error-state">
              <TriangleAlert size={16} /> {error}
            </div>
          ) : !isRunning ? (
            <div className="summary-placeholder">
              <div className="empty-icon">
                <Radio size={24} />
              </div>
              <p>Your research response will appear here.</p>
              <span>Enter a company above to begin.</span>
            </div>
          ) : null}
        </article>
      </section>
      <footer>
        <span>Signal Research Agent</span>
        <span>Private workspace / {new Date().getFullYear()}</span>
      </footer>
    </main>
  );
}

export default App;
