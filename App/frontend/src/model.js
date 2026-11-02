// Data helpers: question shape, payload building, parsing, validation.

let counter = 0;
export const nid = () => `r${++counter}`;

export const newDictRow = (k = "", v = "") => ({ id: nid(), k, v });
export const newListRow = (v = "") => ({ id: nid(), v });

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function newQuestion(type = "choice", extra = {}) {
  return {
    id: nid(),
    key: "",
    type,
    instructions: "",
    // choice -> options with context, score -> plain list (user can switch)
    criteriaMode: type === "score" ? "list" : "dict",
    dictRows: [newDictRow(), newDictRow()],
    listRows: [newListRow(), newListRow()],
    ...extra,
  };
}

// UI question -> the object Laya expects
export function buildQuestion(q) {
  const out = { type: q.type, instructions: q.instructions.trim() };
  if (q.type === "noul") return out; // no options for noul

  if (q.criteriaMode === "dict") {
    const dict = {};
    q.dictRows.forEach((r) => {
      const k = r.k.trim();
      if (k) dict[k] = r.v.trim();
    });
    if (Object.keys(dict).length) out.criteria = dict;
  } else {
    const list = q.listRows.map((r) => r.v.trim()).filter(Boolean);
    if (list.length) out.criteria = list;
  }
  return out;
}

export function buildPayload(stateMode, stateText, questions) {
  let state = stateText;
  let stateError = null;
  if (stateMode === "json") {
    try {
      const parsed = JSON.parse(stateText || "{}");
      if (isPlainObject(parsed)) state = parsed;
      else stateError = "The state must be a JSON object.";
    } catch {
      stateError = "The state isn't valid JSON yet.";
    }
  }
  const qs = {};
  questions.forEach((q) => {
    const key = q.key.trim();
    if (key) qs[key] = buildQuestion(q);
  });
  return { state, questions: qs, stateError };
}

export const requestText = (payload) =>
  JSON.stringify({ state: payload.state, questions: payload.questions }, null, 2);

export function validateQuestion(q, all) {
  const errors = [];
  const key = q.key.trim();
  if (!key) errors.push("Give this question a name.");
  else if (all.filter((o) => o.key.trim() === key).length > 1)
    errors.push("Another question already uses this name.");
  if (!q.instructions.trim()) errors.push("Write the question the model should answer.");

  if (q.type !== "noul") {
    const c = buildQuestion(q).criteria;
    const count = !c ? 0 : Array.isArray(c) ? c.length : Object.keys(c).length;
    if (count < 2) errors.push("Add at least two options.");
  }
  return errors;
}

// ---------- Request JSON text -> validated structure ----------

const QUESTION_TYPES = ["choice", "score", "noul"];

export function parsePayload(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch (e) {
    return { ok: false, errors: [`Not valid JSON: ${e.message}`] };
  }
  if (!isPlainObject(data))
    return { ok: false, errors: ['The request must be a JSON object with "state" and "questions".'] };

  const errors = [];
  for (const k of Object.keys(data))
    if (k !== "state" && k !== "questions")
      errors.push(`Unknown field "${k}". Only "state" and "questions" are allowed.`);

  if (!("state" in data)) errors.push('Missing "state".');
  else if (typeof data.state !== "string" && !isPlainObject(data.state))
    errors.push('"state" must be a string or an object.');

  if (!("questions" in data)) errors.push('Missing "questions".');
  else if (!isPlainObject(data.questions))
    errors.push('"questions" must be an object that maps each question name to its definition.');
  else {
    for (const [key, q] of Object.entries(data.questions)) {
      const at = `questions.${key}`;
      if (!key.trim()) {
        errors.push("Question names can't be empty.");
        continue;
      }
      if (!isPlainObject(q)) {
        errors.push(`${at}: must be an object with "type" and "instructions".`);
        continue;
      }
      for (const f of Object.keys(q))
        if (!["type", "instructions", "criteria"].includes(f))
          errors.push(`${at}: unknown field "${f}".`);
      if (!QUESTION_TYPES.includes(q.type))
        errors.push(`${at}.type: must be "choice", "score" or "noul".`);
      if (typeof q.instructions !== "string") errors.push(`${at}.instructions: must be a string.`);

      if ("criteria" in q) {
        if (q.type === "noul") errors.push(`${at}.criteria: noul questions don't take options.`);
        else if (Array.isArray(q.criteria)) {
          q.criteria.forEach((v, i) => {
            if (typeof v !== "string") errors.push(`${at}.criteria[${i}]: must be a string.`);
          });
        } else if (isPlainObject(q.criteria)) {
          for (const [k, v] of Object.entries(q.criteria))
            if (typeof v !== "string") errors.push(`${at}.criteria.${k}: description must be a string.`);
        } else {
          errors.push(`${at}.criteria: use a list of names or an object of name → description.`);
        }
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, errors: [], state: data.state, questions: data.questions };
}

// Parsed request questions -> form questions (keeps ids of same-named questions)
export function questionsFromParsed(parsed, existing = []) {
  return Object.entries(parsed).map(([key, q]) => {
    const prev = existing.find((e) => e.key.trim() === key && e.type === q.type);
    const out = { ...newQuestion(q.type, prev ? { id: prev.id } : {}), key, instructions: q.instructions };
    if (Array.isArray(q.criteria)) {
      out.criteriaMode = "list";
      out.listRows = q.criteria.length ? q.criteria.map((v) => newListRow(v)) : [newListRow()];
    } else if (q.criteria) {
      out.criteriaMode = "dict";
      const entries = Object.entries(q.criteria);
      out.dictRows = entries.length ? entries.map(([k, v]) => newDictRow(k, v)) : [newDictRow()];
    }
    return out;
  });
}