import dataclasses
from typing import Any, Dict, List, Literal, Optional, Union
from app.core.models import Question

def mock_answers(questions: Dict[str, dict]) -> dict:
    answers = {}
    for key, q in questions.items():
        if q["type"] == "choice":
            crit = q.get("criteria") or ["option"]
            names = list(crit.keys()) if isinstance(crit, dict) else list(crit)
            answers[key] = {"answer": names[0], "probabilities": {n: round(1 / len(names), 3) for n in names}}
        elif q["type"] == "score":
            crit = q.get("criteria") or ["level"]
            names = list(crit.keys()) if isinstance(crit, dict) else list(crit)
            answers[key] = {"answer": names[-1], "probabilities": {n: round(1 / len(names), 3) for n in names}}
        else:
            answers[key] = {"answer": "yes", "probabilities": {"yes": 0.5, "no": 0.5}}
    return {"answers": answers, "mock": True}


def to_plain(o: Any) -> Any:
    """Turn numpy / torch / dataclass objects into plain JSON-safe values."""
    if o is None or isinstance(o, (str, int, float, bool)):
        return o
    if isinstance(o, dict):
        return {str(k): to_plain(v) for k, v in o.items()}
    if isinstance(o, (list, tuple, set)):
        return [to_plain(v) for v in o]
    if dataclasses.is_dataclass(o) and not isinstance(o, type):
        return to_plain(dataclasses.asdict(o))
    if hasattr(o, "tolist"):  # numpy arrays/scalars, torch tensors
        return to_plain(o.tolist())
    if hasattr(o, "__dict__"):
        return to_plain(vars(o))
    return str(o)