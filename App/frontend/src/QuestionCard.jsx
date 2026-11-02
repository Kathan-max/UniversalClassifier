import { newDictRow, newListRow } from "./model.js";

const TYPES = [
  { id: "choice", label: "Choice", hint: "Pick one option" },
  { id: "score", label: "Score", hint: "Rate on a scale" },
  { id: "noul", label: "Noul", hint: "Yes / no style" },
];

export default function QuestionCard({ q, errors, onChange, onRemove, onDuplicate }) {
  const isNoul = q.type === "noul";
  const isDict = q.criteriaMode === "dict";
  const rowsKey = isDict ? "dictRows" : "listRows";
  const rows = q[rowsKey];

  const setRow = (id, patch) =>
    onChange({ [rowsKey]: rows.map((r) => (r.id === id ? { ...r, ...patch, fresh: false } : r)) });
  const addRow = () =>
    onChange({ [rowsKey]: [...rows, { ...(isDict ? newDictRow() : newListRow()), fresh: true }] });
  const removeRow = (id) => rows.length > 1 && onChange({ [rowsKey]: rows.filter((r) => r.id !== id) });

  // Enter in the last field adds another row
  const onEnter = (e, isLast) => {
    if (e.key === "Enter" && isLast) {
      e.preventDefault();
      addRow();
    }
  };

  return (
    <article className={`q q-${q.type}`}>
      <header className="q-head">
        <input
          className="q-key"
          placeholder="question_name"
          aria-label="Question name"
          spellCheck={false}
          value={q.key}
          onChange={(e) => onChange({ key: e.target.value.replace(/\s+/g, "_") })}
        />
        <div className="q-actions">
          <button type="button" className="ghost" onClick={onDuplicate}>Duplicate</button>
          <button type="button" className="ghost danger" onClick={onRemove}>Remove</button>
        </div>
      </header>

      <div className="seg" role="radiogroup" aria-label="Question type">
        {TYPES.map((t) => (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={q.type === t.id}
            className={`t-${t.id}`}
            onClick={() => onChange({ type: t.id })}
          >
            <span>{t.label}</span>
            <small>{t.hint}</small>
          </button>
        ))}
      </div>

      <label className="field">
        <span>Question</span>
        <textarea
          rows={2}
          placeholder="Which department should handle this?"
          value={q.instructions}
          onChange={(e) => onChange({ instructions: e.target.value })}
        />
      </label>

      <fieldset className="criteria" disabled={isNoul}>
        <div className="criteria-head">
          <strong>Options</strong>
          <div className="mode" role="group" aria-label="Option format">
            <button
              type="button"
              aria-pressed={isDict}
              onClick={() => onChange({ criteriaMode: "dict" })}
            >
              With context
            </button>
            <button
              type="button"
              aria-pressed={!isDict}
              onClick={() => onChange({ criteriaMode: "list" })}
            >
              Names only
            </button>
          </div>
        </div>

        {isNoul ? (
          <p className="muted">Noul questions are answered without options.</p>
        ) : (
          <>
            {rows.map((r, i) => {
              const last = i === rows.length - 1;
              return (
                <div className="row" key={r.id}>
                  {isDict ? (
                    <>
                      <input
                        className="opt-name"
                        placeholder="billing"
                        aria-label="Option name"
                        autoFocus={r.fresh}
                        value={r.k}
                        onChange={(e) => setRow(r.id, { k: e.target.value })}
                      />
                      <input
                        className="opt-desc"
                        placeholder="invoices, payments, refunds"
                        aria-label="What this option means"
                        value={r.v}
                        onChange={(e) => setRow(r.id, { v: e.target.value })}
                        onKeyDown={(e) => onEnter(e, last)}
                      />
                    </>
                  ) : (
                    <input
                      placeholder="not urgent"
                      aria-label="Option name"
                      autoFocus={r.fresh}
                      value={r.v}
                      onChange={(e) => setRow(r.id, { v: e.target.value })}
                      onKeyDown={(e) => onEnter(e, last)}
                    />
                  )}
                  <button
                    type="button"
                    className="icon"
                    aria-label="Remove option"
                    disabled={rows.length <= 1}
                    onClick={() => removeRow(r.id)}
                  >
                    ×
                  </button>
                </div>
              );
            })}
            <button type="button" className="ghost add" onClick={addRow}>+ Add option</button>
          </>
        )}
      </fieldset>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </article>
  );
}