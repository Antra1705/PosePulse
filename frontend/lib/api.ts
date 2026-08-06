export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "https://posepulse.onrender.com";

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

export interface FrameMessage {
  type: "frame";
  image: string | null;
  metrics: Record<string, number | string | boolean>;
  progress: Progress;
  coach: CoachMessage | null;
}

const SESSION_KEY = "posepulse_user";

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

export async function fetchHistory(userId: number): Promise<HistoryRow[]> {
  const res = await fetch(`${API_BASE}/api/users/${userId}/history`);

  if (!res.ok) return [];

  const body = await res.json();
  return body.history;
}

export async function sendCoachEvent(
  event: string,
  exercise: string,
): Promise<CoachMessage> {
  const res = await fetch(`${API_BASE}/api/coach/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, exercise, metrics: {} }),
  });

  if (!res.ok) return { text: null, audio: null };

  return res.json();
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
