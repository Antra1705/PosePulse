import { ImageResponse } from "next/og";

export const alt = "PosePulse — Real-time AI Gym Coach";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(139,92,246,0.45), transparent 60%), #0b0b0f",
          color: "#f4f4f5",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 600 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "linear-gradient(135deg, #8b5cf6, #60a5fa)",
            }}
          />
          PosePulse
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 980 }}>
          <div style={{ fontSize: 76, fontWeight: 600, lineHeight: 1.05, letterSpacing: -3 }}>
            Real-time form coaching, powered by computer vision.
          </div>
          <div style={{ fontSize: 28, color: "#a1a1aa" }}>
            Counts your reps. Speaks a correction the moment your form slips.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, fontSize: 20, color: "#c4b5fd" }}>
          <span style={{ padding: "10px 18px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999 }}>33 landmarks / frame</span>
          <span style={{ padding: "10px 18px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999 }}>5 exercises</span>
          <span style={{ padding: "10px 18px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999 }}>Runs in your browser</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
