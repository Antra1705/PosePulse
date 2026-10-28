# PosePulse — Real-time AI Gym Coach

Computer vision that watches every rep through your webcam, counts it, and
tells you out loud what to fix.

- **Frontend:** Next.js 16 (App Router, React Compiler) — landing page + live coach UI
- **Backend:** FastAPI + WebSockets
- **Vision:** MediaPipe Pose Landmarker (33 landmarks / frame)
- **Coach voice:** Groq (Llama 3.3 70B) + gTTS
- **Storage:** SQLite (`data.db`)

## How the live loop works

```
browser                                  server
───────                                  ──────
webcam → <video> (mirrored)
  └─ downscale to ≤480px, JPEG q0.6 ──►  decode → MediaPipe → exercise detector
                                          └─ {landmarks, metrics, progress} ──► draw skeleton on <canvas>
                                          └─ coach cue (LLM + TTS) in background ──► play audio
```

Three things keep it fast on cheap hosting:

1. **Only landmarks come back** (~1 KB JSON), never an annotated JPEG. The
   skeleton is drawn client-side over the local camera feed, so video never
   round-trips.
2. **Ack-based backpressure.** The browser sends the next frame only after the
   previous one is analysed, so latency adapts to the server instead of
   queueing up.
3. **Nothing blocks the event loop.** Inference runs in a worker thread and
   LLM/TTS calls run as background tasks, so a spoken cue never stalls
   tracking.

The frontend also pings `/api/health` as soon as the landing page loads, which
wakes a sleeping free-tier instance before the user reaches the coach.

## Setup

```bash
# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env            # add your GROQ_API_KEY (optional — voice coach)

# Frontend
cd frontend
npm install
cp .env.example .env.local      # NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Run

```bash
# Terminal 1 — API (port 8000)
source .venv/bin/activate
python main.py

# Terminal 2 — Next.js (port 3000)
cd frontend
npm run dev
```

Open <http://localhost:3000>, then **Try it live** → `/coach`.

## Deploy

**Backend (Render):** `render.yaml` is a ready-made Blueprint. Set
`GROQ_API_KEY` in the dashboard. The free plan sleeps after 15 min idle; the
frontend handles the wake-up, but for an always-warm demo either upgrade the
plan or point an uptime monitor at `/api/health` every 10 minutes.

**Frontend (Vercel):** import `frontend/`, set `NEXT_PUBLIC_API_URL` to the
Render URL and `NEXT_PUBLIC_SITE_URL` to the Vercel URL.

> The WebSocket protocol changed in this version (landmarks instead of
> images). Deploy backend and frontend together.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Liveness + model warm-up status (used for wake-up) |
| GET | `/api/exercises` | Supported exercises |
| POST | `/api/login` | `{username}` → `{user_id, username}` |
| GET | `/api/users/{id}/history` | Daily per-exercise summary |
| POST | `/api/coach/event` | One-off coach line (`workout_started`, `workout_completed`) |
| WS | `/ws/workout?user_id&exercise&sets&reps` | Frame in → `pose` / `coach` messages out |

WebSocket messages (server → client):

```jsonc
{ "type": "ready" }
{ "type": "pose", "seq": 12, "landmarks": [[x, y, visibility], …33] | null,
  "metrics": { "reps": 3, "knee_angle": 94, "depth_status": "GOOD DEPTH", "pose_detected": true },
  "progress": { "total_reps": 3, "current_set_reps": 3, "reps_per_set": 10, "sets_completed": 0, "target_sets": 3, "workout_complete": false },
  "infer_ms": 38 }
{ "type": "coach", "text": "Chest up, drive through your heels.", "audio": "<base64 mp3>" }
{ "type": "error", "message": "Bad frame" }
```

## Exercises

Squats · Push-ups · Biceps Curls (Dumbbell) · Shoulder Press · Lunges

## Media

Drop a demo clip at `frontend/public/demo.mp4` and the landing page will play
it; without one it shows a designed preview instead.
