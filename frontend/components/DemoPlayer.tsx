"use client";

import { useEffect, useState } from "react";
import PoseIllustration from "./PoseIllustration";

const DEMO_SRC = "/demo.mp4";

/**
 * Plays `/public/demo.mp4` when present. Without one it renders a designed
 * preview of the live coach so the hero never shows a broken player.
 */
export default function DemoPlayer() {
  const [available, setAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(DEMO_SRC, { method: "HEAD" })
      .then((res) => {
        const type = res.headers.get("content-type") ?? "";
        if (!cancelled) setAvailable(res.ok && type.startsWith("video/"));
      })
      .catch(() => !cancelled && setAvailable(false));

    return () => {
      cancelled = true;
    };
  }, []);

  if (available) {
    return (
      <video
        className="demo-video"
        src={DEMO_SRC}
        controls
        playsInline
        preload="metadata"
        aria-label="PosePulse demo video"
      />
    );
  }

  return (
    <div className="demo-preview" aria-label="Preview of the live coach">
      <div className="demo-preview-grid" aria-hidden="true" />

      <span className="live-pill">
        <span className="live-pill-dot" aria-hidden="true" />
        Live · 15 fps · 14 ms
      </span>

      <div className="demo-preview-hud">
        <div className="hud-card">
          <strong>
            92<span>°</span>
          </strong>
          <span>Knee angle</span>
        </div>
        <div className="hud-card">
          <strong>
            7<span> / 10</span>
          </strong>
          <span>Reps</span>
        </div>
        <div className="hud-card">
          <strong className="hud-ok">Good</strong>
          <span>Depth</span>
        </div>
      </div>

      <PoseIllustration kind="squat" className="demo-preview-figure" />

      <div className="demo-preview-coach">
        <span className="who">Coach</span>
        <span>Drive through your heels, chest up. That&apos;s the depth we want.</span>
      </div>

      {available === null && <span className="sr-only">Checking for demo video…</span>}
    </div>
  );
}
