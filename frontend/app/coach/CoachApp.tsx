"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  type CoachMessage,
  type HistoryRow,
  type Metrics,
  type User,
  clearSession,
  fetchHistory,
  loadSession,
  sendCoachEvent,
} from "../../lib/api";
import {
  Camera,
  Logout,
  Play,
  Stop,
  Waveform,
} from "../../components/Icons";
import Logo from "../../components/Logo";
import LoginWall from "./LoginWall";
import PoseStage from "./PoseStage";
import { EMPTY_PROGRESS, useWorkoutStream } from "./useWorkoutStream";

const EXERCISES = [
  "Squats",
  "Push-ups",
  "Biceps Curls (Dumbbell)",
  "Shoulder Press",
  "Lunges",
] as const;

type Exercise = (typeof EXERCISES)[number];

interface MetricField {
  key: string;
  label: string;
  suffix?: string;
}

const METRIC_LABELS: Record<Exercise, MetricField[]> = {
  Squats: [
    { key: "knee_angle", label: "Knee angle", suffix: "°" },
    { key: "back_angle", label: "Back angle", suffix: "°" },
    { key: "depth_status", label: "Depth" },
  ],
  "Push-ups": [
    { key: "elbow_angle", label: "Elbow angle", suffix: "°" },
    { key: "body_alignment", label: "Alignment" },
    { key: "hip_status", label: "Hips" },
  ],
  "Biceps Curls (Dumbbell)": [
    { key: "elbow_angle", label: "Elbow angle", suffix: "°" },
    { key: "shoulder_status", label: "Elbow position" },
    { key: "swing_status", label: "Swing" },
  ],
  "Shoulder Press": [
    { key: "elbow_angle", label: "Elbow angle", suffix: "°" },
    { key: "extension_status", label: "Extension" },
    { key: "back_arch_status", label: "Back arch" },
  ],
  Lunges: [
    { key: "front_knee_angle", label: "Front knee", suffix: "°" },
    { key: "torso_angle", label: "Torso angle", suffix: "°" },
    { key: "balance_status", label: "Balance" },
  ],
};

const GOOD = new Set([
  "GOOD DEPTH", "STANDING", "Straight", "LEVEL", "STABLE", "NO SWING",
  "FULL EXTENSION", "Neutral", "BALANCED",
]);
const BAD = new Set([
  "TOO HIGH", "Poor Form", "SAGGING", "PIKED UP", "ELBOW DRIFTING", "SWINGING",
  "Excessive Arch", "OFF BALANCE",
]);

function tone(value: unknown): "good" | "bad" | "neutral" {
  if (typeof value !== "string") return "neutral";
  if (GOOD.has(value)) return "good";
  if (BAD.has(value)) return "bad";
  return "neutral";
}

function prettyStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatSeconds(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(date: string) {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function subscribeNoop() {
  return () => {};
}

function useCoachAudio() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return useCallback((audio: string | null | undefined) => {
    if (!audio) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const el = new Audio(`data:audio/mp3;base64,${audio}`);
    audioRef.current = el;
    void el.play().catch(() => undefined);
  }, []);
}

export default function CoachApp() {
  const hydrated = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
  const [user, setUser] = useState<User | null>(() =>
    typeof window === "undefined" ? null : loadSession(),
  );
  const [exercise, setExercise] = useState<Exercise>("Squats");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [planError, setPlanError] = useState<string | null>(null);
  const [coach, setCoach] = useState<CoachMessage | null>(null);
  const [history, setHistory] = useState<HistoryRow[] | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [repFlash, setRepFlash] = useState(0);
  const [lastSummary, setLastSummary] = useState<{
    exercise: string;
    reps: number;
    sets: number;
    seconds: number;
  } | null>(null);

  const playAudio = useCoachAudio();
  const startedAtRef = useRef<number>(0);

  const onCoach = useCallback(
    (msg: CoachMessage) => {
      if (msg.text) setCoach(msg);
      playAudio(msg.audio);
    },
    [playAudio],
  );

  const onRep = useCallback(() => setRepFlash((n) => n + 1), []);

  const stream = useWorkoutStream({ onCoach, onRep });
  const { status, progress, metrics } = stream;

  const active = status === "camera" || status === "connecting" || status === "live";

  const refreshHistory = useCallback(async (userId: number) => {
    setHistoryLoading(true);
    const rows = await fetchHistory(userId);
    setHistory(rows);
    setHistoryLoading(false);
  }, []);

  // Initial history load for the signed-in user (state is set in the
  // promise callback, never synchronously in the effect body).
  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    fetchHistory(user.user_id).then((rows) => {
      if (!cancelled) setHistory(rows);
    });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Auto-finish when the server says the plan is complete.
  useEffect(() => {
    if (progress.workout_complete && status === "live") {
      void endWorkout(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress.workout_complete, status]);

  function handleLogout() {
    stream.stop("idle");
    clearSession();
    setUser(null);
    setHistory(null);
    setCoach(null);
    setLastSummary(null);
  }

  async function startWorkout() {
    if (!user) return;

    const nextSets = Math.floor(Number(sets));
    const nextReps = Math.floor(Number(reps));

    if (!Number.isFinite(nextSets) || nextSets < 1 || nextSets > 50) {
      setPlanError("Sets must be between 1 and 50.");
      return;
    }

    if (!Number.isFinite(nextReps) || nextReps < 1 || nextReps > 50) {
      setPlanError("Reps per set must be between 1 and 50.");
      return;
    }

    setPlanError(null);
    setCoach(null);
    setLastSummary(null);
    startedAtRef.current = Date.now();

    const ok = await stream.start(user, exercise, nextSets, nextReps);
    if (!ok) return;

    const intro = await sendCoachEvent("workout_started", exercise);
    if (intro.text) setCoach(intro);
    playAudio(intro.audio);
  }

  async function endWorkout(completed = false) {
    const snapshot = { ...progress };
    const seconds = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    const currentExercise = exercise;

    stream.stop("ended");

    setLastSummary({
      exercise: currentExercise,
      reps: snapshot.total_reps,
      sets: snapshot.sets_completed,
      seconds,
    });

    if (user) {
      if (!completed) {
        const outro = await sendCoachEvent("workout_completed", currentExercise);
        if (outro.text) setCoach(outro);
        playAudio(outro.audio);
      }
      await refreshHistory(user.user_id);
    }
  }

  if (!hydrated) {
    return (
      <div className="page-loading" role="status">
        <span>Loading session…</span>
      </div>
    );
  }

  if (!user) {
    return <LoginWall onLogin={setUser} />;
  }

  const fields = METRIC_LABELS[exercise];
  const hud = fields.map((f) => {
    const raw = metrics[f.key];
    const isText = typeof raw === "string";
    return {
      label: f.label,
      value: raw == null ? "—" : isText ? prettyStatus(String(raw)) : `${raw}${f.suffix ?? ""}`,
      tone: tone(raw),
      isText,
    };
  });

  const ringTotal = Math.max(1, progress.reps_per_set);
  const ringPct = Math.min(1, progress.current_set_reps / ringTotal);
  const circumference = 2 * Math.PI * 42;

  return (
    <>
      <div className="ambient ambient--app" aria-hidden="true" />

      <div className={`coach-shell ${active ? "coach-shell--active" : ""}`}>
        <aside className="coach-sidebar" aria-label="Workout controls">
          <div className="sidebar-brand">
            <Logo />
          </div>

          <div className="sidebar-user">
            <div className="sidebar-user-name">
              <span>Signed in as</span>
              <strong>{user.username}</strong>
            </div>
            <button
              type="button"
              className="icon-btn"
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
            >
              <Logout size={18} />
            </button>
          </div>

          <hr className="sidebar-divider" />

          <section aria-labelledby="plan-title">
            <p id="plan-title" className="sidebar-section-title">
              Workout plan
            </p>

            {!active ? (
              <div className="form-stack">
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

                <div className="field-row">
                  <div className="field">
                    <label htmlFor="sets">Sets</label>
                    <input
                      id="sets"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={50}
                      value={sets}
                      onChange={(e) => {
                        setSets(e.target.value);
                        setPlanError(null);
                      }}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="reps">Reps / set</label>
                    <input
                      id="reps"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={50}
                      value={reps}
                      onChange={(e) => {
                        setReps(e.target.value);
                        setPlanError(null);
                      }}
                    />
                  </div>
                </div>

                {planError && (
                  <p className="field-error" role="alert">
                    {planError}
                  </p>
                )}

                <button
                  type="button"
                  className="btn-primary btn-block"
                  onClick={() => void startWorkout()}
                >
                  <Play size={16} />
                  Start workout
                </button>
              </div>
            ) : (
              <div className="form-stack">
                <div className="plan-summary">
                  <strong>{exercise}</strong>
                  <span>
                    {progress.target_sets} sets × {progress.reps_per_set} reps
                  </span>
                </div>

                <button
                  type="button"
                  className="btn-danger btn-block"
                  onClick={() => void endWorkout(false)}
                >
                  <Stop size={16} />
                  End workout
                </button>
              </div>
            )}
          </section>

          {active && (
            <>
              <hr className="sidebar-divider" />
              <section aria-labelledby="progress-title">
                <p id="progress-title" className="sidebar-section-title">
                  Progress
                </p>

                <div className="progress-block">
                  <div
                    className="ring"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={ringTotal}
                    aria-valuenow={progress.current_set_reps}
                    aria-label="Reps in current set"
                  >
                    <svg viewBox="0 0 96 96" aria-hidden="true">
                      <circle className="ring-track" cx="48" cy="48" r="42" />
                      <circle
                        className={`ring-fill ${progress.workout_complete ? "ring-fill--done" : ""}`}
                        cx="48"
                        cy="48"
                        r="42"
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - ringPct)}
                      />
                    </svg>
                    <div className="ring-center">
                      <strong>{progress.current_set_reps}</strong>
                      <span>of {progress.reps_per_set}</span>
                    </div>
                  </div>

                  <div className="progress-list">
                    <div className="progress-metric">
                      <span className="label">Total reps</span>
                      <span className="value accent">{progress.total_reps}</span>
                    </div>
                    <div className="progress-metric">
                      <span className="label">Sets done</span>
                      <span className="value">
                        {progress.sets_completed} / {progress.target_sets}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              <hr className="sidebar-divider" />
              <section aria-labelledby="metrics-title">
                <p id="metrics-title" className="sidebar-section-title">
                  Form metrics
                </p>
                <div className="progress-list">
                  {hud.map((h) => (
                    <div key={h.label} className="progress-metric">
                      <span className="label">{h.label}</span>
                      <span
                        className={`value ${h.isText ? "value--text" : ""} ${
                          h.tone === "good" ? "value--good" : h.tone === "bad" ? "value--bad" : ""
                        }`.trim()}
                      >
                        {h.value}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          <div className="sidebar-foot">
            <Link href="/" className="btn-ghost btn-sm">
              ← Back to home
            </Link>
          </div>
        </aside>

        <main id="main" className="coach-main">
          <div className="coach-topbar">
            <div>
              <h2>Live coach</h2>
              <p className="subtitle">Real-time pose detection with spoken form corrections</p>
            </div>

            <div className="pill-row" aria-live="polite">
              {status === "live" && (
                <span className="pill pill--live">
                  <span className="dot" aria-hidden="true" /> Live
                </span>
              )}
              {(status === "camera" || status === "connecting") && (
                <span className="pill pill--warn">
                  <span className="dot" aria-hidden="true" />
                  {status === "camera" ? "Starting camera" : "Connecting"}
                </span>
              )}
              {status === "error" && (
                <span className="pill pill--bad">
                  <span className="dot" aria-hidden="true" /> Disconnected
                </span>
              )}
              {!active && status !== "error" && (
                <span className="pill">
                  <span className="dot" aria-hidden="true" /> Ready
                </span>
              )}
            </div>
          </div>

          {coach?.text && (
            <div className="coach-banner" role="status" aria-live="polite">
              <span className="who">
                <Waveform size={14} /> Coach
              </span>
              <span>{coach.text}</span>
            </div>
          )}

          {stream.error && (
            <div className="alert" role="alert">
              <div>
                <strong>Something went wrong. </strong>
                {stream.error}
              </div>
            </div>
          )}

          {active || status === "error" ? (
            <PoseStage
              videoRef={stream.videoRef}
              poseRef={stream.poseRef}
              status={status}
              poseDetected={stream.poseDetected}
              stats={stream.stats}
              hud={hud}
              repFlash={repFlash}
              metrics={metrics as Metrics}
            />
          ) : (
            <>
              {lastSummary && (
                <div className="summary-card" aria-label="Last workout summary">
                  <div>
                    <span>Last workout</span>
                    <strong style={{ fontSize: 20 }}>{lastSummary.exercise}</strong>
                  </div>
                  <div>
                    <span>Reps</span>
                    <strong>{lastSummary.reps}</strong>
                  </div>
                  <div>
                    <span>Sets</span>
                    <strong>{lastSummary.sets}</strong>
                  </div>
                  <div>
                    <span>Time</span>
                    <strong>{formatSeconds(lastSummary.seconds)}</strong>
                  </div>
                </div>
              )}

              <div className="empty-stage">
                <span className="icon-tile">
                  <Camera size={20} />
                </span>
                <h3>Set your workout plan</h3>
                <p>
                  Choose an exercise, sets and reps in the sidebar, then press Start workout to
                  turn on the camera and the AI coach.
                </p>
                <ul className="empty-tips">
                  <li>
                    <span>Framing</span>
                    Stand 2–3 m back so your whole body is visible.
                  </li>
                  <li>
                    <span>Angle</span>
                    Side-on works best for squats, push-ups and lunges.
                  </li>
                  <li>
                    <span>Sound</span>
                    Turn your volume up to hear the coach&apos;s cues.
                  </li>
                </ul>
              </div>
            </>
          )}

          <div className="section-heading">
            <h3>Workout history</h3>
            {historyLoading && <span>Refreshing…</span>}
          </div>

          {history === null ? (
            <div className="history-empty">Loading your history…</div>
          ) : history.length === 0 ? (
            <div className="history-empty">
              No workouts yet. Finish a set and it will show up here.
            </div>
          ) : (
            <div className="table-wrap">
              <table className="history-table">
                <thead>
                  <tr>
                    <th scope="col">Exercise</th>
                    <th scope="col">Date</th>
                    <th scope="col" className="num">
                      Reps
                    </th>
                    <th scope="col" className="num">
                      Sets
                    </th>
                    <th scope="col" className="num">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={`${row.exercise}-${row.date}`}>
                      <td>{row.exercise}</td>
                      <td>{formatDate(row.date)}</td>
                      <td className="num">{row.reps}</td>
                      <td className="num">{row.sets}</td>
                      <td className="num">{formatSeconds(row.time)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export { EMPTY_PROGRESS };
