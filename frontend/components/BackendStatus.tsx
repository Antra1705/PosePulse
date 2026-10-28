"use client";

import { useEffect, useState } from "react";
import { wakeBackend } from "../lib/api";

type State = "waking" | "online" | "offline";

/**
 * Pings the coach API as soon as the landing page loads so a sleeping
 * free-tier instance is already warm by the time the visitor clicks
 * "Start a workout". Renders a small status pill.
 */
export default function BackendStatus() {
  const [state, setState] = useState<State>("waking");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    wakeBackend((n) => !cancelled && setAttempt(n)).then((health) => {
      if (!cancelled) setState(health ? "online" : "offline");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    state === "online"
      ? "Coach server online"
      : state === "offline"
        ? "Coach server unreachable"
        : attempt > 1
          ? "Waking coach server…"
          : "Checking coach server…";

  return (
    <span className={`status-chip status-chip--${state}`} role="status" aria-live="polite">
      <span className="status-chip-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
