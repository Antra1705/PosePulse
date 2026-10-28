import asyncio
import base64
import logging
import os
import time
from contextlib import asynccontextmanager

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel

from services.config.workout_config import EXERCISE_OPTIONS
from services.persistence.exercise_repository import (
    init_db,
    get_or_create_user,
    get_users_exercise_summary,
)
from services.coaching.llm import LLMCoach
from services.coaching.tts import TextToSpeech
from services.coaching.voice_pipeline import VoicePipeline

load_dotenv()

log = logging.getLogger("posepulse")

STARTED_AT = time.time()


def _build_voice_pipeline():
    api_key = os.environ.get("GROQ_API_KEY", "").strip()

    if not api_key:
        log.warning("GROQ_API_KEY not set — coach voice disabled.")
        return None

    try:
        from groq import Groq

        return VoicePipeline(LLMCoach(Groq(api_key=api_key)), TextToSpeech())
    except Exception:
        log.exception("Could not initialise voice pipeline; continuing without it.")
        return None


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    app.state.voice_pipeline = _build_voice_pipeline()
    app.state.model_ready = False

    async def _warm():
        try:
            from services.vision.pose_analyzer import warm_up

            await asyncio.to_thread(warm_up)
            app.state.model_ready = True
            log.info("Pose model warmed up.")
        except Exception:
            log.exception("Pose model warm-up failed.")

    # Warm the model in the background so health checks answer immediately.
    warm_task = asyncio.create_task(_warm())

    yield

    warm_task.cancel()


app = FastAPI(title="PosePulse API", lifespan=lifespan)

# Frontend fetch calls don't send cookies, so a wide-open CORS policy is fine
# for this demo and avoids "Failed to fetch" from Vercel / localhost mismatches.
_frontend_origins = [
    origin.strip()
    for origin in os.environ.get("FRONTEND_ORIGINS", "*").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_frontend_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)


class LoginRequest(BaseModel):
    username: str


class CoachEventRequest(BaseModel):
    event: str
    exercise: str
    metrics: dict = {}


def _coach_payload(result):
    if not result:
        return {"text": None, "audio": None}

    audio, text = result

    return {
        "text": text,
        "audio": base64.b64encode(audio).decode() if audio else None,
    }


@app.get("/")
def root():
    return {"service": "PosePulse API", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health")
def health():
    """Cheap endpoint used by the frontend to wake a sleeping instance."""
    return {
        "status": "ok",
        "model_ready": bool(getattr(app.state, "model_ready", False)),
        "voice": app.state.voice_pipeline is not None,
        "uptime_s": int(time.time() - STARTED_AT),
    }


@app.get("/api/exercises")
def list_exercises():
    return {"exercises": EXERCISE_OPTIONS}


@app.post("/api/login")
def login(body: LoginRequest):
    username = body.username.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

    if len(username) > 32:
        raise HTTPException(status_code=400, detail="Name must be 32 characters or fewer.")

    user = get_or_create_user(username)
    return {"user_id": user["id"], "username": user["username"]}


@app.get("/api/users/{user_id}/history")
def workout_history(user_id: int):
    rows = get_users_exercise_summary(user_id)

    return {
        "history": [
            {
                "exercise": row["exercise_name"],
                "date": row["date"],
                "reps": row["reps"],
                "sets": row["sets"],
                "time": row["time"],
            }
            for row in rows
        ]
    }


@app.post("/api/coach/event")
async def coach_event(body: CoachEventRequest):
    pipeline = app.state.voice_pipeline

    if pipeline is None:
        return {"text": None, "audio": None}

    # LLM + TTS are blocking network calls — keep them off the event loop.
    result = await asyncio.to_thread(
        pipeline.process_event, body.event, body.exercise, body.metrics
    )
    return _coach_payload(result)


@app.websocket("/ws/workout")
async def workout_stream(
    websocket: WebSocket,
    user_id: int,
    exercise: str,
    sets: int = 3,
    reps: int = 10,
):
    """Receives JPEG frames; returns pose landmarks + metrics (and coach cues).

    Protocol (server → client), all JSON:
      {"type": "ready"}
      {"type": "pose", "seq", "landmarks" | null, "metrics", "progress", "infer_ms"}
      {"type": "coach", "text", "audio"}
      {"type": "error", "message"}

    The client is expected to send the next frame only after it receives the
    ``pose`` reply for the previous one (ack-based backpressure), so latency
    adapts to whatever the server can sustain instead of queueing up.
    """
    from services.vision.pose_analyzer import PoseAnalyzer
    from services.tracking.workout_session import WorkoutSession

    await websocket.accept()

    if exercise not in EXERCISE_OPTIONS:
        await websocket.close(code=4000, reason="Unknown exercise")
        return

    if sets < 1 or reps < 1:
        await websocket.close(code=4000, reason="Sets and reps must be at least 1")
        return

    try:
        analyzer = await asyncio.to_thread(PoseAnalyzer, exercise)
    except Exception:
        log.exception("Failed to create PoseAnalyzer")
        await websocket.close(code=1011, reason="Pose model unavailable")
        return

    session = WorkoutSession(user_id, exercise, sets, reps)
    pipeline = app.state.voice_pipeline

    coach_task: asyncio.Task | None = None
    seq = 0

    async def speak(event: str, payload: dict):
        """Run the coach pipeline in the background and push the result when ready."""
        try:
            result = await asyncio.to_thread(pipeline.process_event, event, exercise, payload)

            if result:
                await websocket.send_json({"type": "coach", **_coach_payload(result)})
        except Exception:
            log.debug("coach task failed", exc_info=True)

    def maybe_coach(event: str, payload: dict):
        nonlocal coach_task

        if pipeline is None:
            return

        busy = coach_task is not None and not coach_task.done()

        # Form-check nudges are best-effort: skip while a line is in flight.
        # Set / workout completion always gets queued after the current line.
        if busy and event == "ongoing_form_check":
            return

        if busy:
            previous = coach_task

            async def chained():
                await previous
                await speak(event, payload)

            coach_task = asyncio.create_task(chained())
        else:
            coach_task = asyncio.create_task(speak(event, payload))

    await websocket.send_json({"type": "ready"})

    try:
        while True:
            data = await websocket.receive_bytes()
            seq += 1

            frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)

            if frame is None:
                await websocket.send_json({"type": "error", "message": "Bad frame"})
                continue

            started = time.perf_counter()
            landmarks, metrics = await asyncio.to_thread(analyzer.analyze, frame)
            infer_ms = int((time.perf_counter() - started) * 1000)

            if metrics.get("pose_detected"):
                event = session.update(metrics.get("reps", 0))
                payload = {**metrics, **session.progress()}
                maybe_coach(event or "ongoing_form_check", payload)

            await websocket.send_json({
                "type": "pose",
                "seq": seq,
                "landmarks": landmarks,
                "metrics": metrics,
                "progress": session.progress(),
                "infer_ms": infer_ms,
            })
    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception("workout stream crashed")
    finally:
        if coach_task is not None and not coach_task.done():
            coach_task.cancel()

        analyzer.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", "8000")),
        reload=os.environ.get("RELOAD", "1") == "1",
    )
