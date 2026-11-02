import { useEffect, useMemo, useRef, useState } from "react";
import QuestionCard from "./QuestionCard.jsx";
import {
  buildPayload,
  newDictRow,
  newListRow,
  newQuestion,
  parsePayload,
  questionsFromParsed,
  requestText,
  validateQuestion,
} from "./model.js";

const SAMPLE_STATE =
  "Hi, we were billed twice for March. Please refund the duplicate today or we will cancel our plan.";

function sampleQuestions() {
  return [
    newQuestion("choice", {
      key: "department",
      instructions: "Which department should handle this?",
      dictRows: [
        newDictRow("billing", "invoices, payments, refunds"),
        newDictRow("technical", "bugs, outages, system errors"),
        newDictRow("other", "everything else"),
      ],
    }),
    newQuestion("score", {
      key: "urgency",
      instructions: "How urgent is this issue?",
      listRows: [newListRow("not urgent"), newListRow("soon"), newListRow("blocking")],
    }),
    newQuestion("noul", {
      key: "churn_risk",
      instructions: "Does the user threaten to cancel or leave?",
    }),
  ];
}

function initialTheme() {
  try {
    const saved = localStorage.getItem("laya-theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage unavailable */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [stateMode, setStateMode] = useState("text");
  const [stateText, setStateText] = useState(SAMPLE_STATE);
  const [questions, setQuestions] = useState(sampleQuestions);
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("laya-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const payload = useMemo(
    () => buildPayload(stateMode, stateText, questions),
    [stateMode, stateText, questions]
  );
  const allErrors = useMemo(
    () => questions.map((q) => validateQuestion(q, questions)),
    [questions]
  );

  // ----- Request editor (two-way synced with the form) -----
  const [draft, setDraft] = useState(() => requestText(payload));
  const [draftErrors, setDraftErrors] = useState([]);
  const fromEditor = useRef(false);

  // Form changed -> rewrite the editor text (unless the change came from the editor itself)
  useEffect(() => {
    if (fromEditor.current) {
      fromEditor.current = false;
      return;
    }
    setDraft(requestText(payload));
    setDraftErrors([]);
  }, [payload]);

  function onEditorChange(text) {
    setDraft(text);
    const parsed = parsePayload(text);
    if (!parsed.ok) {
      setDraftErrors(parsed.errors);
      return; // leave the form untouched until the JSON is valid
    }
    setDraftErrors([]);
    fromEditor.current = true;
    if (typeof parsed.state === "string") {
      setStateMode("text");
      setStateText(parsed.state);
    } else {
      setStateMode("json");
      setStateText(JSON.stringify(parsed.state, null, 2));
    }
    setQuestions((prev) => questionsFromParsed(parsed.questions, prev));
  }

  const revertEditor = () => {
    setDraft(requestText(payload));
    setDraftErrors([]);
  };

  // ----- Form actions -----
  const hasState = stateMode === "json" ? !payload.stateError : stateText.trim().length > 0;
  const canRun =
    hasState &&
    questions.length > 0 &&
    allErrors.every((e) => e.length === 0) &&
    draftErrors.length === 0 &&
    !loading;

  const patchQuestion = (id, patch) =>
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  const removeQuestion = (id) => setQuestions((qs) => qs.filter((q) => q.id !== id));
  const duplicateQuestion = (id) =>
    setQuestions((qs) => {
      const i = qs.findIndex((q) => q.id === id);
      const src = qs[i];
      const copy = newQuestion(src.type, {
        key: src.key ? `${src.key}_copy` : "",
        instructions: src.instructions,
        criteriaMode: src.criteriaMode,
        dictRows: src.dictRows.map((r) => newDictRow(r.k, r.v)),
        listRows: src.listRows.map((r) => newListRow(r.v)),
      });
      return [...qs.slice(0, i + 1), copy, ...qs.slice(i + 1)];
    });

  async function run() {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: payload.state, questions: payload.questions }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const d = data?.detail;
        throw new Error(typeof d === "string" ? d : d ? JSON.stringify(d) : `Request failed (${res.status})`);
      }
      setResponse(data);
    } catch (e) {
      setError(e.message === "Failed to fetch" ? "Can't reach the backend. Is uvicorn running on port 8000?" : e.message);
    } finally {
      setLoading(false);
    }
  }

  const result = response?.result;
  const answers = result && typeof result === "object" ? result.answers ?? result : null;
  const shownErrors = draftErrors.slice(0, 6);

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Laya playground</h1>
          <p>Describe a situation, write typed questions, and get every answer back from one forward pass.</p>
        </div>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? "Light theme" : "Dark theme"}
        </button>
      </header>

      <div className="grid">
        <main>
          <section className="panel">
            <div className="section-head">
              <h2>Situation</h2>
              <div className="mode" role="group" aria-label="State format">
                <button type="button" aria-pressed={stateMode === "text"} onClick={() => setStateMode("text")}>
                  Text
                </button>
                <button
                  type="button"
                  aria-pressed={stateMode === "json"}
                  onClick={() => {
                    setStateMode("json");
                    if (!stateText.trim().startsWith("{"))
                      setStateText('{\n  "from": "user@acme.com",\n  "subject": "",\n  "body": ""\n}');
                  }}
                >
                  JSON
                </button>
              </div>
            </div>
            <textarea
              className={`state ${stateMode === "json" ? "mono" : ""}`}
              rows={stateMode === "json" ? 8 : 4}
              spellCheck={stateMode === "text"}
              value={stateText}
              onChange={(e) => setStateText(e.target.value)}
              aria-label="State"
            />
            {payload.stateError && stateMode === "json" && <p className="inline-error">{payload.stateError}</p>}
          </section>

          <div className="section-head questions-head">
            <h2>Questions</h2>
            <div className="adders">
              <button type="button" className="add-choice" onClick={() => setQuestions((q) => [...q, newQuestion("choice")])}>+ Choice</button>
              <button type="button" className="add-score" onClick={() => setQuestions((q) => [...q, newQuestion("score")])}>+ Score</button>
              <button type="button" className="add-noul" onClick={() => setQuestions((q) => [...q, newQuestion("noul")])}>+ Noul</button>
            </div>
          </div>

          {questions.length === 0 && <p className="empty">No questions yet. Add a choice, score or noul question above.</p>}
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              q={q}
              errors={allErrors[i]}
              onChange={(patch) => patchQuestion(q.id, patch)}
              onRemove={() => removeQuestion(q.id)}
              onDuplicate={() => duplicateQuestion(q.id)}
            />
          ))}
        </main>

        <aside className="side">
          <section className="panel">
            <div className="section-head">
              <h2>Request</h2>
              <button type="button" className="run" disabled={!canRun} onClick={run}>
                {loading ? "Running…" : "Run model"}
              </button>
            </div>
            <textarea
              className={`json-editor ${draftErrors.length ? "invalid" : ""}`}
              rows={16}
              spellCheck={false}
              value={draft}
              onChange={(e) => onEditorChange(e.target.value)}
              aria-label="Request JSON"
              aria-invalid={draftErrors.length > 0}
              aria-describedby="editor-status"
            />
            <div id="editor-status" className={`editor-status ${draftErrors.length ? "bad" : ""}`}>
              {draftErrors.length > 0 ? (
                <div role="alert">
                  <p>
                    <strong>This request doesn't match the expected structure.</strong> The form keeps its last valid values.
                  </p>
                  <ul>
                    {shownErrors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                  {draftErrors.length > shownErrors.length && (
                    <p>+ {draftErrors.length - shownErrors.length} more</p>
                  )}
                  <button type="button" className="ghost" onClick={revertEditor}>Revert to form</button>
                </div>
              ) : (
                <div className="editor-ok">
                  <p className="muted">Edit or paste JSON here and the form updates. Form edits show up here too.</p>
                  <button type="button" className="ghost" onClick={revertEditor}>Format</button>
                </div>
              )}
            </div>
          </section>

          {error && (
            <section className="panel error-panel" role="alert">
              <h2>Something went wrong</h2>
              <p>{error}</p>
            </section>
          )}

          {response && (
            <section className="panel">
              <div className="section-head">
                <h2>Answers</h2>
                <span className="muted">{response.latency_ms} ms</span>
              </div>
              {answers &&
                typeof answers === "object" &&
                Object.entries(answers).map(([key, value]) => {
                  const type = payload.questions[key]?.type;
                  return (
                    <div className={`answer ${type ? `a-${type}` : ""}`} key={key}>
                      <strong>{key}</strong>
                      <pre>{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>
                    </div>
                  );
                })}
              <details>
                <summary>Raw response</summary>
                <pre className="json">{JSON.stringify(result, null, 2)}</pre>
              </details>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}