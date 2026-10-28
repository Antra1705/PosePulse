"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type CoachMessage,
  type Landmark,
  type Metrics,
  type Progress,
  type ServerMessage,
  type User,
  workoutSocketUrl,
} from "../../lib/api";

export type StreamStatus =
  | "idle"
  | "camera"
  | "connecting"
  | "live"
  | "error"
  | "ended";

export interface StreamStats {
  /** round-trip time of the last frame (ms) */
  rtt: number;
  /** server-side inference time of the last frame (ms) */
  inferMs: number;
  /** analysed frames per second, smoothed */
  fps: number;
}

export interface PoseSnapshot {
  landmarks: Landmark[] | null;
  at: number;
}

export const EMPTY_PROGRESS: Progress = {
  total_reps: 0,
  current_set_reps: 0,
  reps_per_set: 10,
  sets_completed: 0,
  target_sets: 3,
  workout_complete: false,
};

/** Longest edge of the frame we upload. Pose quality is unchanged at this
 * size (the model downsamples to 256px internally) but JPEG encode, upload
 * and decode get ~4× cheaper than 640×480. */
const UPLOAD_MAX_EDGE = 480;
const JPEG_QUALITY = 0.6;
/** Minimum gap between frames even if the server is faster than this. */
const MIN_FRAME_INTERVAL_MS = 50;
/** If a frame is never acknowledged, resume after this long. */
const ACK_TIMEOUT_MS = 2500;

interface Options {
  onCoach: (msg: CoachMessage) => void;
  onRep?: () => void;
}

export function useWorkoutStream({ onCoach, onRep }: Options) {
  const [status, setStatus] = useState<StreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [metrics, setMetrics] = useState<Metrics>({});
  const [poseDetected, setPoseDetected] = useState<boolean | null>(null);
  const [stats, setStats] = useState<StreamStats>({ rtt: 0, inferMs: 0, fps: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const poseRef = useRef<PoseSnapshot>({ landmarks: null, at: 0 });

  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const captureRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const watchdogRef = useRef<number | null>(null);
  const pumpingRef = useRef(false);
  const sentAtRef = useRef(0);
  const fpsRef = useRef({ last: 0, value: 0 });
  const lastRepsRef = useRef(0);
  const lastPoseSeenRef = useRef<boolean | null>(null);
  const sendFrameRef = useRef<() => Promise<void>>(async () => {});

  const onCoachRef = useRef(onCoach);
  const onRepRef = useRef(onRep);

  useEffect(() => {
    onCoachRef.current = onCoach;
    onRepRef.current = onRep;
  }, [onCoach, onRep]);

  const clearTimers = useCallback(() => {
    if (timerRef.current != null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (watchdogRef.current != null) {
      window.clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  const stop = useCallback(
    (finalStatus: StreamStatus = "ended") => {
      pumpingRef.current = false;
      clearTimers();

      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
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

      poseRef.current = { landmarks: null, at: 0 };
      setStatus(finalStatus);
    },
    [clearTimers],
  );

  // Release camera + socket on unmount.
  useEffect(() => () => stop("idle"), [stop]);

  // ── frame pump (ack-based) ───────────────────────────────────────────────

  const scheduleNext = useCallback(
    (delay: number) => {
      if (!pumpingRef.current) return;
      clearTimers();
      timerRef.current = window.setTimeout(
        () => void sendFrameRef.current(),
        Math.max(0, delay),
      );
    },
    [clearTimers],
  );

  const sendFrame = useCallback(async () => {
    if (!pumpingRef.current) return;

    const video = videoRef.current;
    const ws = wsRef.current;

    if (!video || !ws || ws.readyState !== WebSocket.OPEN || video.readyState < 2) {
      scheduleNext(80);
      return;
    }

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const scale = Math.min(1, UPLOAD_MAX_EDGE / Math.max(vw, vh));
    const w = Math.round(vw * scale);
    const h = Math.round(vh * scale);

    let canvas = captureRef.current;

    if (!canvas) {
      canvas = document.createElement("canvas");
      captureRef.current = canvas;
    }

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const ctx = canvas.getContext("2d", { alpha: false });

    if (!ctx) {
      scheduleNext(80);
      return;
    }

    ctx.drawImage(video, 0, 0, w, h);

    const target = canvas;
    const blob = await new Promise<Blob | null>((resolve) =>
      target.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );

    if (!blob || !pumpingRef.current || ws.readyState !== WebSocket.OPEN) {
      scheduleNext(80);
      return;
    }

    const buf = await blob.arrayBuffer();

    if (!pumpingRef.current || ws.readyState !== WebSocket.OPEN) return;

    sentAtRef.current = performance.now();
    ws.send(buf);

    // If the ack never arrives (dropped frame, server hiccup), keep going.
    watchdogRef.current = window.setTimeout(() => {
      if (pumpingRef.current) void sendFrameRef.current();
    }, ACK_TIMEOUT_MS);
  }, [scheduleNext]);

  useEffect(() => {
    sendFrameRef.current = sendFrame;
  }, [sendFrame]);

  // ── message handling ─────────────────────────────────────────────────────

  const handleMessage = useCallback(
    (raw: string) => {
      let msg: ServerMessage;

      try {
        msg = JSON.parse(raw) as ServerMessage;
      } catch {
        return;
      }

      switch (msg.type) {
        case "ready": {
          setStatus("live");
          pumpingRef.current = true;
          void sendFrame();
          break;
        }

        case "pose": {
          const now = performance.now();
          const rtt = Math.round(now - sentAtRef.current);

          // smoothed fps
          const f = fpsRef.current;
          if (f.last) {
            const inst = 1000 / Math.max(1, now - f.last);
            f.value = f.value ? f.value * 0.8 + inst * 0.2 : inst;
          }
          f.last = now;

          poseRef.current = { landmarks: msg.landmarks, at: now };

          const detected = Boolean(msg.metrics?.pose_detected);
          if (detected !== lastPoseSeenRef.current) {
            lastPoseSeenRef.current = detected;
            setPoseDetected(detected);
          }

          if (msg.metrics) setMetrics(msg.metrics);

          if (msg.progress) {
            setProgress(msg.progress);

            if (msg.progress.total_reps > lastRepsRef.current) {
              onRepRef.current?.();
            }
            lastRepsRef.current = msg.progress.total_reps;
          }

          setStats({ rtt, inferMs: msg.infer_ms ?? 0, fps: Math.round(f.value) });

          // Backpressure: ask for the next frame only now, but never faster
          // than MIN_FRAME_INTERVAL_MS.
          scheduleNext(MIN_FRAME_INTERVAL_MS - rtt);
          break;
        }

        case "coach": {
          onCoachRef.current({ text: msg.text, audio: msg.audio });
          break;
        }

        case "error": {
          // Bad frame — just continue.
          scheduleNext(MIN_FRAME_INTERVAL_MS);
          break;
        }
      }
    },
    [scheduleNext, sendFrame],
  );

  // ── public API ───────────────────────────────────────────────────────────

  const start = useCallback(
    async (user: User, exercise: string, sets: number, reps: number) => {
      setError(null);
      setMetrics({});
      setPoseDetected(null);
      setStats({ rtt: 0, inferMs: 0, fps: 0 });
      setProgress({ ...EMPTY_PROGRESS, reps_per_set: reps, target_sets: sets });
      lastRepsRef.current = 0;
      lastPoseSeenRef.current = null;
      fpsRef.current = { last: 0, value: 0 };
      poseRef.current = { landmarks: null, at: 0 };

      setStatus("camera");

      let stream: MediaStream;

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        });
      } catch (err) {
        const name = err instanceof DOMException ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera permission was denied. Allow camera access in your browser and try again."
            : name === "NotFoundError"
              ? "No camera found. Connect a webcam and try again."
              : "Could not start the camera. Close other apps using it and try again.",
        );
        setStatus("error");
        return false;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch {
          // autoplay policies — the stream still renders once the user interacts
        }
      }

      setStatus("connecting");

      const ws = new WebSocket(workoutSocketUrl(user.user_id, exercise, sets, reps));
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onmessage = (event) => handleMessage(event.data as string);

      ws.onerror = () => {
        setError(
          "Lost connection to the coach server. It may be waking up — try again in a moment.",
        );
      };

      ws.onclose = (event) => {
        pumpingRef.current = false;
        clearTimers();

        if (wsRef.current !== ws) return;

        if (event.code === 4000) {
          setError(event.reason || "The server rejected this workout plan.");
          setStatus("error");
        } else if (event.code === 1011) {
          setError("The pose model is unavailable on the server right now.");
          setStatus("error");
        } else {
          setStatus((prev) => (prev === "live" || prev === "connecting" ? "error" : prev));
          setError((prev) => prev ?? "Connection closed by the server.");
        }
      };

      return true;
    },
    [clearTimers, handleMessage],
  );

  return {
    status,
    error,
    progress,
    metrics,
    poseDetected,
    stats,
    videoRef,
    poseRef,
    start,
    stop,
  };
}
