"""
Env vars:
    LAYA_MODEL   Hugging Face repo to load (default: convaiinnovations/laya)
    LAYA_MOCK=1  Skip loading the model and return fake answers. Handy for
                 working on the frontend when the machine is short on memory.
"""
import os
import threading
import time
import torch
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import APIRouter, FastAPI, HTTPException
from app.core.models import PredictRequest
from app.core.methods import mock_answers, to_plain

MODEL_ID = os.getenv("LAYA_MODEL", "convaiinnovations/laya")
MOCK = os.getenv("LAYA_MOCK") == "1"

_ctx: Dict[str, Any] = {}
_lock = threading.Lock()


router = APIRouter(
    prefix="/api",
    tags=["api"],
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    if MOCK:
        print("LAYA_MOCK=1 -> not loading a model")
        _ctx["agent"] = None
    else:
        import laya

        print(f"Loading {MODEL_ID} ...")
        _ctx["agent"] = laya.load(MODEL_ID, device="cuda" if torch.cuda.is_available() else "cpu")
        print("Model ready.")

    yield

    _ctx.clear()

@router.get("/health")
def health():
    return {"ok": True, "model": MODEL_ID, "mock": MOCK}

@router.post("/predict")
def predict(req: PredictRequest):
    questions = {k: q.model_dump(exclude_none=True) for k, q in req.questions.items()}
    for q in questions.values():
        if q["type"] == "noul":
            q.pop("criteria", None)  # noul takes no options

    started = time.perf_counter()
    try:
        if MOCK:
            result = mock_answers(questions)
        else:
            with _lock:
                result = _ctx["agent"].predict(req.state, questions)
    except Exception as e:  # surface model errors to the UI
        raise HTTPException(status_code=500, detail=f"{type(e).__name__}: {e}")

    return {
        "result": to_plain(result),
        "latency_ms": round((time.perf_counter() - started) * 1000, 1),
    }