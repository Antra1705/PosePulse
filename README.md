# PosePulse — Real-time AI GYM Coach

Next.js frontend + FastAPI backend recreation of [ai-gym-coach](https://github.com/shradha-khapra/ai-gym-coach) — same landing look, same exercises and coaching flow, **without Streamlit**.

## Stack

- **Frontend:** Next.js (App Router) — landing page + live coach UI
- **Backend:** FastAPI + WebSockets
- **Vision:** MediaPipe Pose Landmarker
- **Coach voice:** Groq LLM + gTTS

## Setup

```bash
# Backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Put your Groq key in .env
echo 'GROQ_API_KEY=your_key_here' >> .env

# Frontend
cd frontend
npm install
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

Open [http://localhost:3000](http://localhost:3000) for the landing page, then **Try it live** → `/coach`.

## App flow

1. Landing page (same visual language as the reference LandingPage)
2. `/coach` login with a username
3. Pick exercise / sets / reps → Start Workout
4. Webcam frames stream over WebSocket; backend returns annotated pose + metrics + optional coach audio
5. Workout history is stored in SQLite (`data.db`)

## Exercises

- Squats
- Push-ups
- Biceps Curls (Dumbbell)
- Shoulder Press
- Lunges

Drop gallery screenshots into `frontend/public/gallery/` and a demo clip at `frontend/public/demo.mp4` if you want real media instead of placeholders.
