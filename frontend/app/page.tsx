import Link from "next/link";

const GALLERY = [
  {
    tilt: "card-tilt-left",
    tag: "01 — SQUATS",
    label: "Depth + back-angle form checks",
  },
  {
    tilt: "card-center",
    tag: "02 — PUSH-UPS",
    label: "Body alignment + hip tracking",
  },
  {
    tilt: "card-tilt-right",
    tag: "03 — SHOULDER PRESS",
    label: "Extension + back-arch detection",
  },
  {
    tilt: "card-tilt-right",
    tag: "04 — BICEPS CURLS",
    label: "Swing + elbow-drift detection",
  },
  {
    tilt: "card-center",
    tag: "05 — LUNGES",
    label: "Balance + knee-angle tracking",
  },
  {
    tilt: "card-tilt-left",
    tag: "06 — LIVE COACH",
    label: "Rep counting with voice feedback",
  },
];

const FEATURES = [
  { title: "Pose Detection", desc: "MediaPipe landmarks every frame" },
  { title: "Audio Feedback", desc: "Spoken coaching cues via TTS" },
  { title: "Rep Counter", desc: "Sets, reps, and history tracked" },
  { title: "Works in Real-time", desc: "Webcam in, annotated feed out" },
];

function CornerBrackets({ prefix = "card" }: { prefix?: string }) {
  const cls = prefix === "video" ? "video-corner" : "card-corner";
  return (
    <>
      <div className={`${cls} tl`} />
      <div className={`${cls} tr`} />
      <div className={`${cls} bl`} />
      <div className={`${cls} br`} />
    </>
  );
}

export default function LandingPage() {
  return (
    <>
      <div className="grid-overlay" aria-hidden="true" />

      <nav className="nav">
        <div className="nav-logo">
          <span className="logo-bracket">(</span>POSEPULSE
          <span className="logo-bracket">)</span>
        </div>
        <div className="nav-links">
          <a href="#visuals">Gallery</a>
          <a href="#demo">Demo</a>
          <a href="#contact">Contact</a>
        </div>
      </nav>

      <section className="hero" id="hero">
        <div className="hero-tag">
          <span className="dot" />
          <span>AI-POWERED · REAL-TIME · GYM COACH</span>
        </div>

        <h1 className="hero-title">
          <span className="line-one">REAL-TIME</span>
          <span className="line-two">
            AI GYM
            <br />
            COACH
          </span>
        </h1>

        <p className="hero-sub">
          Your form. Analyzed. Corrected. In milliseconds.
          <br />
          Computer vision that watches every rep and tells you exactly what to
          fix.
        </p>

        <div className="hero-cta-row">
          <Link href="/coach" className="btn-primary">
            <span>Try it live</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M3 8H13M13 8L9 4M13 8L9 12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <a href="#demo" className="btn-ghost">
            WATCH DEMO ↓
          </a>
        </div>

        <div className="metrics-strip">
          <div className="metric">
            <span className="metric-val">
              100<span className="unit">ms</span>
            </span>
            <span className="metric-label">Avg Latency</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-val">
              5<span className="unit">+</span>
            </span>
            <span className="metric-label">Exercises</span>
          </div>
          <div className="metric-divider" />
          <div className="metric">
            <span className="metric-val">
              95<span className="unit">%</span>
            </span>
            <span className="metric-label">Form Accuracy</span>
          </div>
        </div>
      </section>

      <section className="visuals" id="visuals">
        <div className="center-header section-header">
          <span className="section-tag">{"// GALLERY"}</span>
          <h2 className="section-title">
            Built for
            <br />
            <em>real athletes</em>
          </h2>
        </div>

        <div className="card-grid">
          {GALLERY.map((card) => (
            <div key={card.tag} className={`img-card ${card.tilt}`}>
              <div className="card-inner">
                <div className="card-img-wrap img-placeholder">
                  <span className="placeholder-label">{card.label}</span>
                  <div className="card-scan-line" />
                </div>
                <div className="card-label">
                  <span className="card-tag">{card.tag}</span>
                  <p>{card.label}</p>
                </div>
                <CornerBrackets />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="demo" id="demo">
        <div className="center-header section-header">
          <span className="section-tag">{"// DEMO"}</span>
          <h2 className="section-title">
            See it in
            <br />
            <em>action</em>
          </h2>
          <p className="section-desc">
            Watch the AI detect and correct form errors in real-time. No hardware
            required — just your phone or webcam.
          </p>
        </div>

        <div className="video-wrapper">
          <div className="video-glow" />
          <div className="video-container">
            <CornerBrackets prefix="video" />
            <div className="video-status">
              <span className="dot pulse-dot" />
              <span>DEMO</span>
            </div>
            <video src="/demo.mp4" controls playsInline />
          </div>
        </div>

        <div className="feature-row">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="feature">
              <span className="feature-icon">⬡</span>
              <strong>{feature.title}</strong>
              <p>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="contact" id="contact">
        <div className="contact-inner">
          <span className="section-tag">{"// LET'S CONNECT"}</span>
          <h2 className="contact-title">
            Built by a human.
            <br />
            <em>Backed by data.</em>
          </h2>
          <p className="contact-desc">
            Open to opportunities in ML engineering, computer vision, and AI
            product roles.
          </p>

          <div className="social-grid">
            <a
              href="https://www.linkedin.com/in/antra-dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn"
            >
              <span className="social-icon">in</span>
              <span className="social-label">LinkedIn</span>
            </a>
            <a
              href="https://github.com/Antra1705"
              target="_blank"
              rel="noopener noreferrer"
              className="social-btn"
            >
              <span className="social-icon">{"</>"}</span>
              <span className="social-label">GitHub</span>
            </a>
            <a href="mailto:antra.1705@gmail.com" className="social-btn">
              <span className="social-icon">@</span>
              <span className="social-label">Gmail</span>
            </a>
          </div>
        </div>

        <footer className="footer">
          <span>© 2026 PosePulse — Real-time AI Gym Coach</span>
          <span className="footer-mono">POSEPULSE</span>
        </footer>
      </section>
    </>
  );
}
