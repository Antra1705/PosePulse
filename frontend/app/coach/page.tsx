"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {
  CoachMessage,
  FrameMessage,
  HistoryRow,
  Progress,
  User,
  clearSession,
  fetchHistory,
  loadSession,
  login,
  sendCoachEvent,
  workoutSocketUrl,
} from "../../lib/api";

const EXERCISES = [
  "Squats",
  "Push-ups",
  "Biceps Curls (Dumbbell)",
  "Shoulder Press",
  "Lunges",
] as const;

type Exercise = (typeof EXERCISES)[number];

const EMPTY_PROGRESS: Progress = {
  total_reps: 0,
  current_set_reps: 0,
  reps_per_set: 10,
  sets_completed: 0,
  target_sets: 3,
  workout_complete: false,
};

const METRIC_LABELS: Record<Exercise, { key: string; label: string; suffix?: string }[]> = {
  Squats: [
    { key: "knee_angle", label: "Knee Angle", suffix: "°" },
    { key: "back_angle", label: "Back Angle", suffix: "°" },
    { key: "depth_status", label: "Depth Status" },
  ],
  "Push-ups": [
    { key: "elbow_angle", label: "Elbow Angle", suffix: "°" },
    { key: "body_alignment", label: "Body Alignment" },
    { key: "hip_status", label: "Hip Position" },
  ],
  "Biceps Curls (Dumbbell)": [
    { key: "elbow_angle", label: "Elbow Angle", suffix: "°" },
    { key: "shoulder_status", label: "Shoulder Stability" },
    { key: "swing_status", label: "Swing Detection" },
  ],
  "Shoulder Press": [
    { key: "elbow_angle", label: "Elbow Angle", suffix: "°" },
    { key: "extension_status", label: "Arm Extension" },
    { key: "back_arch_status", label: "Back Arch" },
  ],
  Lunges: [
    { key: "front_knee_angle", label: "Front Knee Angle", suffix: "°" },
    { key: "torso_angle", label: "Torso Angle", suffix: "°" },
    { key: "balance_status", label: "Balance Status" },
  ],
};

function playAudioBase64(audio: string | null | undefined) {
  if (!audio) return;

  const el = new Audio(`data:audio/mp3;base64,${audio}`);
  void el.play().catch(() => undefined);
}

function LoginWall({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const user = await login(username);
      onLogin(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      // Browser surfaces network/CORS failures as this opaque string
      if (message === "Failed to fetch") {
        setError(
          "Cannot reach API. Wake https://posepulse.onrender.com/api/exercises then retry.",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="grid-overlay" aria-hidden="true" />
      <div className="login-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <Link href="/" className="section-tag" style={{ display: "inline-block", marginBottom: 16 }}>
            ← Back to home
          </Link>
          <h1>
            <em>PosePulse</em>
          </h1>
          <p>Welcome! Please enter a username to start.</p>

          <div className="field">
            <label htmlFor="username">Name (unique)</label>
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="unique name e.g. princekhunt"
              autoComplete="username"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", marginTop: 20 }}
            disabled={loading}
          >
            {loading ? "Starting…" : "Start Session"}
          </button>

          {error && <p className="login-error">{error}</p>}
        </form>
      </div>
    </>
  );
}

export default function CoachPage() {
  const [user, setUser] = useState<User | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [exercise, setExercise] = useState<Exercise>("Squats");
  const [sets, setSets] = useState(3);
  const [reps, setReps] = useState(10);
  const [planError, setPlanError] = useState<string | null>(null);
  const [workoutStarted, setWorkoutStarted] = useState(false);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [metrics, setMetrics] = useState<Record<string, number | string | boolean>>({});
  const [coach, setCoach] = useState<CoachMessage | null>(null);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [connected, setConnected] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const pumpTimeoutRef = useRef<number | null>(null);
  const pumpingRef = useRef(false);

  async function refreshHistory(userId: number) {
    const rows = await fetchHistory(userId);
    setHistory(rows);
  }

  useEffect(() => {
    const saved = loadSession();
    if (saved) setUser(saved);
    setSessionReady(true);
  }, []);

  useEffect(() => {
    if (user) void refreshHistory(user.user_id);
  }, [user]);

  useEffect(() => {
    return () => {
      stopWorkoutStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLogout() {
    stopWorkoutStream();
    setWorkoutStarted(false);
    clearSession();
    setUser(null);
    setHistory([]);
    setCoach(null);
    setMetrics({});
    setProgress(EMPTY_PROGRESS);
  }

  function stopWorkoutStream() {
    pumpingRef.current = false;

    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (pumpTimeoutRef.current != null) {
      window.clearTimeout(pumpTimeoutRef.current);
      pumpTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setConnected(false);
    setFrameSrc(null);
  }

  function pumpFrames() {
    if (!pumpingRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ws = wsRef.current;

    if (!video || !canvas || !ws || ws.readyState !== WebSocket.OPEN) {
      pumpTimeoutRef.current = window.setTimeout(() => {
        rafRef.current = requestAnimationFrame(pumpFrames);
      }, 80);
      return;
    }

    if (video.readyState >= 2) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (blob && ws.readyState === WebSocket.OPEN && pumpingRef.current) {
              void blob.arrayBuffer().then((buf) => {
                if (ws.readyState === WebSocket.OPEN && pumpingRef.current) {
                  ws.send(buf);
                }
              });
            }
          },
          "image/jpeg",
          0.7,
        );
      }
    }

    // ~12 fps keeps latency reasonable for the pose pipeline
    pumpTimeoutRef.current = window.setTimeout(() => {
      rafRef.current = requestAnimationFrame(pumpFrames);
    }, 80);
  }

  async function startWorkout() {
    if (!user) return;

    const nextSets = Math.floor(Number(sets));
    const nextReps = Math.floor(Number(reps));

    if (!Number.isFinite(nextSets) || nextSets < 1) {
      setPlanError("Sets must be at least 1.");
      return;
    }

    if (!Number.isFinite(nextReps) || nextReps < 1) {
      setPlanError("Reps per set must be at least 1.");
      return;
    }

    setPlanError(null);
    setSets(nextSets);
    setReps(nextReps);
    setCameraError(null);
    setProgress({
      ...EMPTY_PROGRESS,
      reps_per_set: nextReps,
      target_sets: nextSets,
    });
    setMetrics({});
    setCoach(null);
    setWorkoutStarted(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const ws = new WebSocket(
        workoutSocketUrl(user.user_id, exercise, nextSets, nextReps),
      );
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        pumpingRef.current = true;
        pumpFrames();
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data as string) as FrameMessage;

        if (msg.image) {
          setFrameSrc(`data:image/jpeg;base64,${msg.image}`);
        }

        if (msg.metrics) setMetrics(msg.metrics);
        if (msg.progress) setProgress(msg.progress);

        if (msg.coach) {
          setCoach(msg.coach);
          playAudioBase64(msg.coach.audio);
        }

        if (msg.progress?.workout_complete) {
          void refreshHistory(user.user_id);
        }
      };

      ws.onerror = () => {
        setCameraError("Lost connection to the coach API. Is the backend running on :8000?");
      };

      ws.onclose = () => {
        setConnected(false);
      };

      const intro = await sendCoachEvent("workout_started", exercise);
      setCoach(intro);
      playAudioBase64(intro.audio);
    } catch (err) {
      setCameraError(
        err instanceof Error
          ? err.message
          : "Could not access webcam. Allow camera permission and try again.",
      );
      setWorkoutStarted(false);
      stopWorkoutStream();
    }
  }

  async function endWorkout() {
    const currentExercise = exercise;
    stopWorkoutStream();
    setWorkoutStarted(false);

    if (user) {
      const outro = await sendCoachEvent("workout_completed", currentExercise);
      setCoach(outro);
      playAudioBase64(outro.audio);
      await refreshHistory(user.user_id);
    }
  }

  if (!sessionReady) {
    return (
      <>
        <div className="grid-overlay" aria-hidden="true" />
        <div className="login-wrap">
          <p className="sidebar-user">Loading session…</p>
        </div>
      </>
    );
  }

  if (!user) {
    return <LoginWall onLogin={setUser} />;
  }

  const metricFields = METRIC_LABELS[exercise];

  return (
    <>
      <div className="grid-overlay" aria-hidden="true" />

      <div className="coach-shell">
        <aside className="coach-sidebar">
          <div>
            <h1>
              <em>PosePulse</em>
            </h1>
            <p className="sidebar-user">Login as {user.username}</p>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleLogout}
              style={{ marginTop: 10, width: "100%", textAlign: "center" }}
            >
              Log out
            </button>
          </div>

          <hr className="sidebar-divider" />

          <div>
            <p className="sidebar-section-title">Workout Plan</p>

            {!workoutStarted ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
                <div className="field">
                  <label htmlFor="exercise">Exercise</label>
                  <select
                    id="exercise"
                    value={exercise}
                    onChange={(e) => setExercise(e.target.value as Exercise)}
                  >
                    {EXERCISES.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="sets">Sets</label>
                  <input
                    id="sets"
                    type="number"
                    min={1}
                    max={50}
                    value={sets}
                    onChange={(e) => {
                      setSets(Number(e.target.value));
                      setPlanError(null);
                    }}
                  />
                </div>

                <div className="field">
                  <label htmlFor="reps">Reps per Set</label>
                  <input
                    id="reps"
                    type="number"
                    min={1}
                    max={50}
                    value={reps}
                    onChange={(e) => {
                      setReps(Number(e.target.value));
                      setPlanError(null);
                    }}
                  />
                </div>

                {planError && <p className="login-error">{planError}</p>}

                <button type="button" className="btn-primary" onClick={() => void startWorkout()}>
                  Start Workout
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
                <div className="plan-summary">
                  <strong>{exercise}</strong>
                  <div>
                    {sets} Sets / {reps} Reps
                  </div>
                </div>

                <button type="button" className="btn-danger" onClick={() => void endWorkout()}>
                  End Workout
                </button>
              </div>
            )}
          </div>

          {workoutStarted && (
            <>
              <hr className="sidebar-divider" />
              <div>
                <p className="sidebar-section-title">Progress</p>
                <div className="progress-metric">
                  <span className="label">Total Reps</span>
                  <span className="value accent">{progress.total_reps}</span>
                </div>
                <div className="progress-metric">
                  <span className="label">Current Set</span>
                  <span className="value">
                    {progress.current_set_reps} / {progress.reps_per_set}
                  </span>
                </div>
                <div className="progress-metric">
                  <span className="label">Sets Done</span>
                  <span className="value">
                    {progress.sets_completed} / {progress.target_sets}
                  </span>
                </div>
              </div>

              <hr className="sidebar-divider" />
              <div>
                <p className="sidebar-section-title">{exercise} Metrics</p>
                {metricFields.map((field) => {
                  const raw = metrics[field.key];
                  const display =
                    raw === undefined || raw === null
                      ? "—"
                      : `${raw}${field.suffix ?? ""}`;

                  return (
                    <div key={field.key} className="progress-metric">
                      <span className="label">{field.label}</span>
                      <span className="value" style={{ fontSize: "1.1rem" }}>
                        {display}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <div style={{ marginTop: "auto" }}>
            <Link href="/" className="btn-ghost" style={{ display: "inline-block" }}>
              ← Landing
            </Link>
          </div>
        </aside>

        <main className="coach-main">
          <h2>PosePulse Coach</h2>
          <p className="subtitle">
            Real-time pose detection with proactive AI voice coaching
          </p>

          {coach?.text && (
            <div className="coach-banner">
              <span className="who">Coach:</span>
              <span>{coach.text}</span>
            </div>
          )}

          {!workoutStarted ? (
            <div className="empty-stage">
              <h3>Set your workout plan</h3>
              <p>
                Choose your exercise, sets and reps in the sidebar, then click Start Workout to
                activate the camera and AI coach.
              </p>
            </div>
          ) : (
            <>
              <p className="status-line">
                Camera:{" "}
                <span className={connected ? "ok" : "bad"}>
                  {connected ? "LIVE" : "CONNECTING…"}
                </span>
                {cameraError && (
                  <>
                    {" · "}
                    <span className="bad">{cameraError}</span>
                  </>
                )}
              </p>

              <div className="video-stage">
                <div className="live-tag">
                  <span className="dot pulse-dot" />
                  <span>LIVE</span>
                </div>
                {frameSrc ? (
                  // Annotated frame from the backend pose pipeline
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={frameSrc} alt="Annotated workout feed" />
                ) : (
                  <div
                    style={{
                      aspectRatio: "4 / 3",
                      display: "grid",
                      placeItems: "center",
                      color: "var(--muted)",
                      background: "#000",
                    }}
                  >
                    Waiting for first frame…
                  </div>
                )}
              </div>
            </>
          )}

          {/* Hidden capture elements */}
          <video ref={videoRef} playsInline muted style={{ display: "none" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          <h3
            style={{
              fontFamily: "var(--font-display), serif",
              fontWeight: 400,
              fontSize: "1.5rem",
              marginBottom: 16,
            }}
          >
            Workout History
          </h3>

          {history.length === 0 ? (
            <div className="history-empty">No workout history found.</div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Date</th>
                  <th>Reps</th>
                  <th>Sets</th>
                  <th>Time (sec)</th>
                </tr>
              </thead>
              <tbody>
                {history.map((row) => (
                  <tr key={`${row.exercise}-${row.date}`}>
                    <td>{row.exercise}</td>
                    <td>{row.date}</td>
                    <td>{row.reps}</td>
                    <td>{row.sets}</td>
                    <td>{row.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </main>
      </div>
    </>
  );
}
