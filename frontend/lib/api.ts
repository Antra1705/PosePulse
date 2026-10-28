export const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://posepulse.onrender.com"
).replace(/\/$/, "");

export const WS_BASE = API_BASE.replace(/^http/, "ws");

export interface User {
  user_id: number;
  username: string;
}

export interface HistoryRow {
  exercise: string;
  date: string;
  reps: number;
  sets: number;
  time: number;
}

export interface Progress {
  total_reps: number;
  current_set_reps: number;
  reps_per_set: number;
  sets_completed: number;
  target_sets: number;
  workout_complete: boolean;
}

export interface CoachMessage {
  text: string | null;
  audio: string | null;
}

export type Metrics = Record<string, number | string | boolean>;

/** `[x, y, visibility]` in normalised (0‥1) mirrored image space. */
export type Landmark = [number, number, number];

export type ServerMessage =
  | { type: "ready" }
  | {
      type: "pose";
      seq: number;
      landmarks: Landmark[] | null;
      metrics: Metrics;
      progress: Progress;
      infer_ms: number;
    }
  | ({ type: "coach" } & CoachMessage)
  | { type: "error"; message: string };

export interface Health {
  status: string;
  model_ready: boolean;
  voice: boolean;
  uptime_s: number;
}

const SESSION_KEY = "posepulse_user";

// ── Backend wake-up ──────────────────────────────────────────────────────────

/**
 * Pings the API. Resolves with the health payload, or `null` if unreachable.
 * A hard timeout keeps a sleeping Render instance from hanging the UI.
 */
export async function pingHealth(timeoutMs = 8000): Promise<Health | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/api/health`, {
      signal: controller.signal,
      cache: "no-store",
    });

    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Keeps pinging until the backend answers (free-tier hosts sleep after
 * inactivity and take 30‑60 s to boot). Calls `onAttempt` each try.
 */
export async function wakeBackend(
  onAttempt?: (attempt: number) => void,
  maxAttempts = 12,
): Promise<Health | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    onAttempt?.(attempt);
    const health = await pingHealth(attempt === 1 ? 6000 : 10000);
    if (health) return health;
    await new Promise((r) => setTimeout(r, 2500));
  }

  return null;
}

// ── Auth / session ───────────────────────────────────────────────────────────

export async function login(username: string): Promise<User> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Login failed");
  }

  const user: User = await res.json();
  saveSession(user);
  return user;
}

export function saveSession(user: User) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // ignore quota / private-mode failures
  }
}

export function loadSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<User>;
    if (
      typeof parsed.user_id === "number" &&
      typeof parsed.username === "string" &&
      parsed.username.trim()
    ) {
      return { user_id: parsed.user_id, username: parsed.username };
    }
  } catch {
    // ignore corrupt session
  }

  return null;
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// ── Data ─────────────────────────────────────────────────────────────────────

export async function fetchHistory(userId: number): Promise<HistoryRow[]> {
  try {
    const res = await fetch(`${API_BASE}/api/users/${userId}/history`, {
      cache: "no-store",
    });

    if (!res.ok) return [];

    const body = await res.json();
    return body.history ?? [];
  } catch {
    return [];
  }
}

export async function sendCoachEvent(
  event: string,
  exercise: string,
): Promise<CoachMessage> {
  try {
    const res = await fetch(`${API_BASE}/api/coach/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, exercise, metrics: {} }),
    });

    if (!res.ok) return { text: null, audio: null };

    return res.json();
  } catch {
    return { text: null, audio: null };
  }
}

export function workoutSocketUrl(
  userId: number,
  exercise: string,
  sets: number,
  reps: number,
): string {
  const params = new URLSearchParams({
    user_id: String(userId),
    exercise,
    sets: String(sets),
    reps: String(reps),
  });

  return `${WS_BASE}/ws/workout?${params}`;
}
