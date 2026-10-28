import Link from "next/link";
import SiteNav from "../components/SiteNav";
import BackendStatus from "../components/BackendStatus";
import DemoPlayer from "../components/DemoPlayer";
import Logo from "../components/Logo";
import PoseIllustration, { type PoseKind } from "../components/PoseIllustration";
import {
  ArrowRight,
  Bolt,
  Brain,
  Camera,
  Counter,
  Github,
  History,
  Linkedin,
  Mail,
  Shield,
  Skeleton,
  Waveform,
  Wifi,
} from "../components/Icons";

const STEPS = [
  {
    n: "01",
    title: "Allow your camera",
    desc: "Open the coach, type a name, pick an exercise and your sets × reps. Nothing to install, nothing to wear.",
    Icon: Camera,
  },
  {
    n: "02",
    title: "We track 33 landmarks",
    desc: "Each frame goes to the vision server, which finds your joints and measures the angles that matter for the movement.",
    Icon: Skeleton,
  },
  {
    n: "03",
    title: "Hear the correction",
    desc: "Reps are counted automatically. When your form slips, the coach speaks a short, specific cue so you can fix it mid-set.",
    Icon: Waveform,
  },
];

const FEATURES = [
  {
    title: "Live pose detection",
    desc: "MediaPipe Pose Landmarker on every frame, with the skeleton drawn directly over your own camera feed.",
    Icon: Skeleton,
  },
  {
    title: "Spoken coaching cues",
    desc: "An LLM turns the detected issue into a ten-word cue, synthesised to speech and played instantly.",
    Icon: Waveform,
  },
  {
    title: "Automatic rep counting",
    desc: "Joint-angle state machines count clean reps only, split them into sets and know when you are done.",
    Icon: Counter,
  },
  {
    title: "Form-specific metrics",
    desc: "Knee depth, back angle, hip sag, elbow drift, torso swing. The right numbers for each exercise, live.",
    Icon: Brain,
  },
  {
    title: "Workout history",
    desc: "Every completed set is saved per user so you can see reps, sets and time across sessions.",
    Icon: History,
  },
  {
    title: "Private by design",
    desc: "Frames are analysed in memory and discarded. No video is ever stored, only your rep counts.",
    Icon: Shield,
  },
];

const EXERCISES: { kind: PoseKind; name: string; checks: string[] }[] = [
  { kind: "squat", name: "Squats", checks: ["Knee depth", "Back angle", "Lockout"] },
  { kind: "pushup", name: "Push-ups", checks: ["Elbow angle", "Alignment", "Hip sag"] },
  { kind: "press", name: "Shoulder Press", checks: ["Extension", "Back arch", "Elbow path"] },
  { kind: "curl", name: "Biceps Curls", checks: ["Elbow angle", "Torso swing", "Elbow drift"] },
  { kind: "lunge", name: "Lunges", checks: ["Front knee", "Torso angle", "Balance"] },
  { kind: "coach", name: "Live Coach", checks: ["Rep counting", "Set tracking", "Voice cues"] },
];

const STACK = ["Next.js 16", "FastAPI", "MediaPipe", "OpenCV", "Groq · Llama 3.3", "gTTS", "SQLite"];

const PERF = [
  {
    Icon: Wifi,
    title: "Landmarks, not video, come back",
    desc: "The server returns about 1 KB of joint data per frame. The skeleton is drawn in your browser over your own camera feed, so video never round-trips.",
  },
  {
    Icon: Bolt,
    title: "Adaptive frame rate",
    desc: "The next frame is sent only after the previous one is analysed, so latency adapts to the connection instead of piling up.",
  },
  {
    Icon: Waveform,
    title: "Coaching never blocks tracking",
    desc: "Voice cues are generated in the background while rep counting keeps running at full speed.",
  },
];

const FAQ = [
  {
    q: "Do I need any special hardware?",
    a: "No. Any laptop webcam or phone camera works. Stand far enough back that your whole body is in frame, in reasonably even light.",
  },
  {
    q: "Is my video stored anywhere?",
    a: "No. Frames are streamed to the vision server, analysed in memory and discarded immediately. Only rep counts, sets and timings are saved against your username.",
  },
  {
    q: "Why does the first start take a moment?",
    a: "The demo backend runs on a free tier that sleeps when idle. This page pings it as soon as you arrive, so it is usually warm by the time you press start. If not, the coach shows a wake-up status instead of failing.",
  },
  {
    q: "Which exercises are supported?",
    a: "Squats, push-ups, dumbbell biceps curls, shoulder press and lunges. Each has its own detector with exercise-specific form checks.",
  },
  {
    q: "Can I run it myself?",
    a: "Yes. The project is open source: a Next.js frontend and a FastAPI backend. Clone the repo, add a Groq API key for the voice coach, and run both with two commands.",
  },
];

function SectionHeader({
  eyebrow,
  title,
  desc,
}: {
  eyebrow: string;
  title: React.ReactNode;
  desc?: string;
}) {
  return (
    <div className="section-header">
      <span className="eyebrow">{eyebrow}</span>
      <h2 className="section-title">{title}</h2>
      {desc && <p className="section-desc">{desc}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <SiteNav />

      <main id="main">
        {/* ── HERO ── */}
        <section className="hero" id="hero">
          <div className="hero-copy">
            <BackendStatus />
            <h1 className="hero-title">
              Real-time form coaching, <span>powered by computer vision.</span>
            </h1>
            <p className="hero-sub">
              PosePulse watches your reps through your webcam, counts them, and speaks a
              correction the moment your form slips. No hardware, just a browser.
            </p>
            <div className="cta-row">
              <Link href="/coach" className="btn-primary btn-lg">
                Start a workout
                <ArrowRight size={16} />
              </Link>
              <a href="#how" className="btn-ghost btn-lg">
                See how it works
              </a>
            </div>
          </div>

          <div className="hero-stage">
            <div className="stage-frame">
              <DemoPlayer />
            </div>
          </div>

          <ul className="proof-row" aria-label="Key facts">
            <li>
              <strong>33</strong>
              <span>body landmarks per frame</span>
            </li>
            <li>
              <strong>5</strong>
              <span>exercises coached</span>
            </li>
            <li>
              <strong>~1 KB</strong>
              <span>per frame over the wire</span>
            </li>
            <li>
              <strong>0</strong>
              <span>installs. Runs in your browser</span>
            </li>
          </ul>
        </section>

        {/* ── STACK ── */}
        <section className="stack" aria-label="Built with">
          <span className="stack-label">Built with</span>
          <ul className="stack-row">
            {STACK.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="section" id="how">
          <SectionHeader
            eyebrow="How it works"
            title="Three steps to better reps"
            desc="From opening the page to your first spoken correction takes under a minute."
          />
          <ol className="steps">
            {STEPS.map(({ n, title, desc, Icon }) => (
              <li key={n} className="card step">
                <div className="step-top">
                  <span className="icon-tile">
                    <Icon size={20} />
                  </span>
                  <span className="step-n">{n}</span>
                </div>
                <h3>{title}</h3>
                <p>{desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── FEATURES ── */}
        <section className="section" id="features">
          <SectionHeader
            eyebrow="Features"
            title="Everything a coach would watch for"
            desc="Built for people training alone: the feedback a good trainer gives, delivered the instant you need it."
          />
          <div className="feature-grid">
            {FEATURES.map(({ title, desc, Icon }) => (
              <article key={title} className="card feature-card">
                <span className="icon-tile">
                  <Icon size={20} />
                </span>
                <h3>{title}</h3>
                <p>{desc}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ── EXERCISES ── */}
        <section className="section" id="exercises">
          <SectionHeader
            eyebrow="Exercises"
            title="Five movements, each with its own detector"
            desc="Every exercise is tuned to the joints and angles that define good form for that movement."
          />
          <div className="exercise-grid">
            {EXERCISES.map((ex) => (
              <article key={ex.kind} className="card exercise-card">
                <div className="exercise-visual">
                  <PoseIllustration kind={ex.kind} />
                </div>
                <div className="exercise-body">
                  <h3>{ex.name}</h3>
                  <ul className="chip-row">
                    {ex.checks.map((c) => (
                      <li key={c}>{c}</li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── PERFORMANCE ── */}
        <section className="section" id="speed">
          <div className="perf-layout">
            <div className="perf-intro">
              <span className="eyebrow">Fast by design</span>
              <h2 className="section-title">Built to feel instant, even on a free server</h2>
              <p className="section-desc">
                The pipeline was designed around one rule: nothing heavy should ever sit between your
                movement and the feedback.
              </p>
              <div className="perf-stat">
                <strong>&lt; 50 ms</strong>
                <span>typical server inference per frame</span>
              </div>
            </div>
            <ul className="perf-list">
              {PERF.map(({ Icon, title, desc }) => (
                <li key={title} className="card perf-item">
                  <span className="icon-tile">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3>{title}</h3>
                    <p>{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="section" id="faq">
          <SectionHeader eyebrow="FAQ" title="Questions, answered" />
          <div className="faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="faq-item">
                <summary>
                  <span>{item.q}</span>
                  <span className="faq-plus" aria-hidden="true" />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="section section--cta" id="start">
          <div className="cta-card">
            <span className="eyebrow">Ready when you are</span>
            <h2 className="cta-title">Your next set, coached.</h2>
            <p className="section-desc">
              Open the coach, allow your camera, and get your first correction within the first rep.
            </p>
            <div className="cta-row">
              <Link href="/coach" className="btn-primary btn-lg">
                Start a workout
                <ArrowRight size={16} />
              </Link>
              <a
                href="https://github.com/Antra1705/PosePulse"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost btn-lg"
              >
                <Github size={16} />
                View source
              </a>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="footer">
          <div className="footer-top">
            <div className="footer-brand">
              <Logo />
              <p>Real-time AI gym coach. Built by a human, backed by data.</p>
              <p className="footer-open">
                Open to opportunities in ML engineering, computer vision and AI product roles.
              </p>
            </div>
            <div className="footer-col">
              <span>Product</span>
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#exercises">Exercises</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-col">
              <span>Connect</span>
              <a href="https://www.linkedin.com/in/antra-dev/" target="_blank" rel="noopener noreferrer">
                <Linkedin size={15} /> LinkedIn
              </a>
              <a href="https://github.com/Antra1705" target="_blank" rel="noopener noreferrer">
                <Github size={15} /> GitHub
              </a>
              <a href="mailto:antra.1705@gmail.com">
                <Mail size={15} /> Email
              </a>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} PosePulse</span>
            <Link href="/coach">Open the coach →</Link>
          </div>
        </footer>
      </main>
    </>
  );
}
