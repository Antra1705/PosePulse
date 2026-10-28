"use client";

import { type RefObject, useEffect, useRef } from "react";
import type { Metrics } from "../../lib/api";
import type { PoseSnapshot, StreamStats, StreamStatus } from "./useWorkoutStream";
import { Spinner } from "../../components/Icons";

/** Same topology as the backend's POSE_CONNECTIONS. */
const CONNECTIONS: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [24, 26], [25, 27], [26, 28], [27, 29], [28, 30],
  [29, 31], [30, 32], [27, 31], [28, 32],
];

const MIN_VIS = 0.5;
/** Skeleton fades out if the server goes quiet for longer than this. */
const STALE_MS = 1200;

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  poseRef: RefObject<PoseSnapshot>;
  status: StreamStatus;
  poseDetected: boolean | null;
  stats: StreamStats;
  hud: { label: string; value: string; tone?: "good" | "bad" | "neutral"; isText?: boolean }[];
  repFlash: number;
  metrics: Metrics;
}

export default function PoseStage({
  videoRef,
  poseRef,
  status,
  poseDetected,
  stats,
  hud,
  repFlash,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Draw loop — reads the latest landmarks from a ref so React never
  // re-renders per frame.
  useEffect(() => {
    let raf = 0;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const video = videoRef.current;

    if (!canvas || !wrap || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styles = getComputedStyle(document.documentElement);
    const accent = styles.getPropertyValue("--accent").trim() || "#8b5cf6";
    const accent2 = styles.getPropertyValue("--accent-2").trim() || "#60a5fa";

    const draw = () => {
      raf = requestAnimationFrame(draw);

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = wrap.clientWidth;
      const ch = wrap.clientHeight;

      if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
        canvas.width = Math.round(cw * dpr);
        canvas.height = Math.round(ch * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);

      const snap = poseRef.current;
      if (!snap.landmarks) return;

      const age = performance.now() - snap.at;
      if (age > STALE_MS * 2) return;

      // The <video> is object-fit: contain inside the wrap. Map normalised
      // coords onto the actual rendered video rectangle.
      const vw = video.videoWidth || 4;
      const vh = video.videoHeight || 3;
      const scale = Math.min(cw / vw, ch / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const ox = (cw - dw) / 2;
      const oy = (ch - dh) / 2;

      const alpha = age > STALE_MS ? Math.max(0, 1 - (age - STALE_MS) / STALE_MS) : 1;
      const lw = Math.max(2, dw / 220);
      const r = Math.max(3, dw / 150);

      ctx.globalAlpha = alpha;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      const pts = snap.landmarks;

      // bones
      ctx.strokeStyle = accent;
      ctx.lineWidth = lw;
      ctx.shadowColor = "rgba(139,92,246,0.55)";
      ctx.shadowBlur = lw * 2;
      ctx.beginPath();
      for (const [a, b] of CONNECTIONS) {
        const pa = pts[a];
        const pb = pts[b];
        if (!pa || !pb || pa[2] < MIN_VIS || pb[2] < MIN_VIS) continue;
        ctx.moveTo(ox + pa[0] * dw, oy + pa[1] * dh);
        ctx.lineTo(ox + pb[0] * dw, oy + pb[1] * dh);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // joints (skip face landmarks 1‥10 for a cleaner look)
      ctx.fillStyle = "#0b0b0f";
      ctx.strokeStyle = accent2;
      ctx.lineWidth = Math.max(1.5, lw * 0.7);
      for (let i = 0; i < pts.length; i++) {
        if (i > 0 && i <= 10) continue;
        const p = pts[i];
        if (!p || p[2] < MIN_VIS) continue;
        ctx.beginPath();
        ctx.arc(ox + p[0] * dw, oy + p[1] * dh, i === 0 ? r * 1.6 : r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [videoRef, poseRef]);

  const isLive = status === "live";

  return (
    <div className="pose-stage" ref={wrapRef}>
      <video ref={videoRef} playsInline muted autoPlay aria-label="Your camera" />
      <canvas ref={canvasRef} aria-hidden="true" />
      <div key={repFlash} className={`rep-flash ${repFlash ? "is-on" : ""}`} aria-hidden="true" />

      <div className="live-tag">
        <span className={`dot ${isLive ? "pulse-dot" : ""}`} aria-hidden="true" />
        <span>{isLive ? "LIVE" : status === "connecting" ? "CONNECTING" : "CAMERA"}</span>
      </div>

      {isLive && stats.rtt > 0 && (
        <div className="latency-tag" aria-label="Stream statistics">
          <span>
            <b>{stats.fps}</b> fps
          </span>
          <span>
            <b>{stats.rtt}</b> ms rtt
          </span>
          <span>
            <b>{stats.inferMs}</b> ms infer
          </span>
        </div>
      )}

      {isLive && hud.length > 0 && (
        <div className="stage-hud">
          {hud.map((h) => (
            <div key={h.label} className="hud-chip">
              <span>{h.label}</span>
              <strong
                className={`${h.isText ? "text" : ""} ${
                  h.tone === "good" ? "value--good" : h.tone === "bad" ? "value--bad" : ""
                }`.trim()}
              >
                {h.value}
              </strong>
            </div>
          ))}
        </div>
      )}

      {status === "camera" && (
        <div className="stage-overlay">
          <Spinner size={22} />
          <strong>Starting camera</strong>
          <span>Allow camera access when your browser asks.</span>
        </div>
      )}

      {status === "connecting" && (
        <div className="stage-overlay">
          <Spinner size={22} />
          <strong>Connecting to coach</strong>
          <span>Loading the pose model on the server. This can take a few seconds on first start.</span>
        </div>
      )}

      {isLive && poseDetected === false && (
        <div className="stage-overlay" style={{ background: "rgba(0,0,0,0.35)" }}>
          <strong>No pose detected</strong>
          <span>Step back so your whole body is in frame and face the camera.</span>
        </div>
      )}
    </div>
  );
}
