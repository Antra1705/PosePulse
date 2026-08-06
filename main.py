import os
import base64

import cv2
import numpy as np
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(title="PosePulse API")

# Frontend fetch calls don't send cookies, so a wide-open CORS policy is fine
# for this demo and avoids "Failed to fetch" from Vercel / localhost mismatches.
_frontend_origins = [
    origin.strip()
    for origin in os.environ.get(
        "FRONTEND_ORIGINS",
        "*",
    ).split(",")
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


def _build_voice_pipeline():
    try:
        from groq import Groq

        groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
        return VoicePipeline(LLMCoach(groq_client), TextToSpeech())
    except Exception:
        return None


@app.on_event("startup")
def startup():
    init_db()
    app.state.voice_pipeline = _build_voice_pipeline()


class LoginRequest(BaseModel):
    username: str


class CoachEventRequest(BaseModel):
    event: str
    exercise: str
    metrics: dict = {}


@app.get("/api/exercises")
def list_exercises():
    return {"exercises": EXERCISE_OPTIONS}


@app.post("/api/login")
def login(body: LoginRequest):
    username = body.username.strip()

    if not username:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")

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
def coach_event(body: CoachEventRequest):
    pipeline = app.state.voice_pipeline

    if pipeline is None:
        return {"text": None, "audio": None}

    result = pipeline.process_event(body.event, body.exercise, body.metrics)

    if not result:
        return {"text": None, "audio": None}

    audio, text = result

    return {
        "text": text,
        "audio": base64.b64encode(audio).decode() if audio else None,
    }


@app.websocket("/ws/workout")
async def workout_stream(
    websocket: WebSocket,
    user_id: int,
    exercise: str,
    sets: int = 3,
    reps: int = 10,
):
    """Receives JPEG frames, returns annotated frames + metrics + coach audio."""
    from services.vision.pose_analyzer import PoseAnalyzer
    from services.tracking.workout_session import WorkoutSession

    await websocket.accept()

    if exercise not in EXERCISE_OPTIONS:
        await websocket.close(code=4000, reason="Unknown exercise")
        return

    if sets < 1 or reps < 1:
        await websocket.close(code=4000, reason="Sets and reps must be at least 1")
        return

    analyzer = PoseAnalyzer(exercise)
    session = WorkoutSession(user_id, exercise, sets, reps)
    pipeline = app.state.voice_pipeline

    try:
        while True:
            data = await websocket.receive_bytes()

            frame = cv2.imdecode(np.frombuffer(data, dtype=np.uint8), cv2.IMREAD_COLOR)

            if frame is None:
                continue

            annotated, metrics = analyzer.process_frame(frame)

            coach = None

            if metrics.get("pose_detected") and pipeline:
                event = session.update(metrics.get("reps", 0))
                payload = {**metrics, **session.progress()}

                if event:
                    result = pipeline.process_event(event, exercise, payload)
                else:
                    result = pipeline.process_event(
                        "ongoing_form_check", exercise, payload
                    )

                if result:
                    audio, text = result
                    coach = {
                        "text": text,
                        "audio": base64.b64encode(audio).decode() if audio else None,
                    }
            elif metrics.get("pose_detected"):
                session.update(metrics.get("reps", 0))

            ok, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 80])

            await websocket.send_json({
                "type": "frame",
                "image": base64.b64encode(buffer).decode() if ok else None,
                "metrics": metrics,
                "progress": session.progress(),
                "coach": coach,
            })
    except WebSocketDisconnect:
        pass
    finally:
        analyzer.close()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
