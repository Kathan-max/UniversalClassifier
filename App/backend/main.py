"""
Laya playground backend.

Run from the backend/ folder:
    uvicorn main:app --reload --port 8000
"""


from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.core.api import router, lifespan


app = FastAPI(title="Laya playground", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(router)

