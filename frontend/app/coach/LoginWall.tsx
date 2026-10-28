"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useState } from "react";
import { type User, login, wakeBackend } from "../../lib/api";
import { ArrowRight, Spinner } from "../../components/Icons";
import { LogoMark } from "../../components/Logo";

type Backend = "waking" | "online" | "offline";

export default function LoginWall({ onLogin }: { onLogin: (user: User) => void }) {
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [backend, setBackend] = useState<Backend>("waking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    wakeBackend((n) => !cancelled && setAttempt(n)).then((h) => {
      if (!cancelled) setBackend(h ? "online" : "offline");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // If the server is still waking, give it one more nudge before logging in.
      if (backend !== "online") {
        const h = await wakeBackend(undefined, 6);
        setBackend(h ? "online" : "offline");
        if (!h) {
          throw new Error(
            "The coach server isn't responding yet. It may be waking from sleep — wait a few seconds and try again.",
          );
        }
      }

      const user = await login(username.trim());
      onLogin(user);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(
        message === "Failed to fetch"
          ? "Couldn't reach the coach server. Check your connection and try again."
          : message,
      );
    } finally {
      setLoading(false);
    }
  }

  const chipLabel =
    backend === "online"
      ? "Coach server online"
      : backend === "offline"
        ? "Coach server unreachable"
        : attempt > 1
          ? `Waking coach server… (${attempt})`
          : "Checking coach server…";

  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <main id="main" className="login-wrap">
        <form className="login-card card" onSubmit={handleSubmit} noValidate>
          <Link href="/" className="back">
            ← Back to home
          </Link>
          <LogoMark size={44} />
          <h1>Welcome to the coach</h1>
          <p>Pick a name so your workouts are saved. No password needed.</p>

          <div className="field">
            <label htmlFor="username">Your name</label>
            <input
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError(null);
              }}
              placeholder="e.g. antra"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={32}
              required
              aria-describedby="username-hint"
              aria-invalid={error ? true : undefined}
            />
            <span id="username-hint" className="field-hint">
              Use the same name next time to see your history.
            </span>
          </div>

          <button
            type="submit"
            className="btn-primary btn-block"
            disabled={loading || !username.trim()}
          >
            {loading ? (
              <>
                <Spinner size={16} /> Starting…
              </>
            ) : (
              <>
                Start session <ArrowRight size={16} />
              </>
            )}
          </button>

          {error && (
            <p className="login-error" role="alert">
              {error}
            </p>
          )}

          <span
            className={`status-chip status-chip--${backend}`}
            role="status"
            aria-live="polite"
          >
            <span className="status-chip-dot" aria-hidden="true" />
            {chipLabel}
          </span>

          <p className="login-note">
            You&apos;ll be asked for camera access when you start a workout. Video is analysed
            live and never stored.
          </p>
        </form>
      </main>
    </>
  );
}
