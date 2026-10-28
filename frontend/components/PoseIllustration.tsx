/**
 * Inline SVG stick-figure renderings of each exercise. Drawn in the same
 * visual language as the live skeleton overlay so the landing page previews
 * what users will actually see in the coach.
 */

type Pt = [number, number];

interface Figure {
  points: Record<string, Pt>;
  bones: [string, string][];
  /** joint that gets the highlighted angle arc */
  focus?: { joint: string; label: string; a: string; c: string };
  ground?: number;
}

const FIGURES: Record<string, Figure> = {
  squat: {
    points: {
      head: [44, 20],
      shoulder: [44, 32],
      elbow: [58, 40],
      wrist: [72, 34],
      hip: [36, 56],
      knee: [60, 62],
      ankle: [56, 86],
      toe: [68, 88],
    },
    bones: [
      ["head", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "wrist"],
      ["shoulder", "hip"],
      ["hip", "knee"],
      ["knee", "ankle"],
      ["ankle", "toe"],
    ],
    focus: { joint: "knee", label: "92°", a: "hip", c: "ankle" },
    ground: 89,
  },
  pushup: {
    points: {
      head: [16, 50],
      shoulder: [28, 56],
      elbow: [26, 70],
      wrist: [24, 84],
      hip: [54, 60],
      knee: [72, 64],
      ankle: [88, 70],
      toe: [90, 84],
    },
    bones: [
      ["head", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "wrist"],
      ["shoulder", "hip"],
      ["hip", "knee"],
      ["knee", "ankle"],
      ["ankle", "toe"],
    ],
    focus: { joint: "hip", label: "178°", a: "shoulder", c: "knee" },
    ground: 86,
  },
  press: {
    points: {
      head: [50, 20],
      ls: [38, 34],
      rs: [62, 34],
      le: [26, 24],
      re: [74, 24],
      lw: [30, 8],
      rw: [70, 8],
      lh: [42, 58],
      rh: [58, 58],
      lk: [40, 76],
      rk: [60, 76],
      la: [40, 92],
      ra: [60, 92],
    },
    bones: [
      ["head", "ls"],
      ["head", "rs"],
      ["ls", "rs"],
      ["ls", "le"],
      ["le", "lw"],
      ["rs", "re"],
      ["re", "rw"],
      ["ls", "lh"],
      ["rs", "rh"],
      ["lh", "rh"],
      ["lh", "lk"],
      ["lk", "la"],
      ["rh", "rk"],
      ["rk", "ra"],
    ],
    focus: { joint: "re", label: "128°", a: "rs", c: "rw" },
    ground: 94,
  },
  curl: {
    points: {
      head: [50, 16],
      shoulder: [50, 30],
      elbow: [52, 50],
      wrist: [62, 34],
      hip: [50, 58],
      knee: [50, 78],
      ankle: [50, 94],
      toe: [60, 95],
    },
    bones: [
      ["head", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "wrist"],
      ["shoulder", "hip"],
      ["hip", "knee"],
      ["knee", "ankle"],
      ["ankle", "toe"],
    ],
    focus: { joint: "elbow", label: "48°", a: "shoulder", c: "wrist" },
    ground: 96,
  },
  lunge: {
    points: {
      head: [46, 12],
      shoulder: [46, 26],
      elbow: [50, 40],
      wrist: [52, 54],
      hip: [44, 54],
      fk: [64, 66],
      fa: [64, 88],
      ft: [74, 89],
      bk: [34, 80],
      ba: [18, 86],
    },
    bones: [
      ["head", "shoulder"],
      ["shoulder", "elbow"],
      ["elbow", "wrist"],
      ["shoulder", "hip"],
      ["hip", "fk"],
      ["fk", "fa"],
      ["fa", "ft"],
      ["hip", "bk"],
      ["bk", "ba"],
    ],
    focus: { joint: "fk", label: "90°", a: "hip", c: "fa" },
    ground: 90,
  },
  coach: {
    points: {
      head: [50, 18],
      ls: [38, 32],
      rs: [62, 32],
      le: [30, 48],
      re: [70, 48],
      lw: [26, 62],
      rw: [74, 62],
      lh: [42, 58],
      rh: [58, 58],
      lk: [40, 76],
      rk: [60, 76],
      la: [40, 92],
      ra: [60, 92],
    },
    bones: [
      ["head", "ls"],
      ["head", "rs"],
      ["ls", "rs"],
      ["ls", "le"],
      ["le", "lw"],
      ["rs", "re"],
      ["re", "rw"],
      ["ls", "lh"],
      ["rs", "rh"],
      ["lh", "rh"],
      ["lh", "lk"],
      ["lk", "la"],
      ["rh", "rk"],
      ["rk", "ra"],
    ],
    ground: 94,
  },
};

export type PoseKind = keyof typeof FIGURES;

function angleArc(fig: Figure) {
  if (!fig.focus) return null;

  const b = fig.points[fig.focus.joint];
  const a = fig.points[fig.focus.a];
  const c = fig.points[fig.focus.c];
  const r = 9;

  const ang = (p: Pt) => Math.atan2(p[1] - b[1], p[0] - b[0]);
  let a1 = ang(a);
  let a2 = ang(c);

  // sweep the shorter way around
  let diff = a2 - a1;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (diff < 0) {
    [a1, a2] = [a2, a1];
    diff = -diff;
  }

  const sx = b[0] + r * Math.cos(a1);
  const sy = b[1] + r * Math.sin(a1);
  const ex = b[0] + r * Math.cos(a2);
  const ey = b[1] + r * Math.sin(a2);
  const large = diff > Math.PI ? 1 : 0;

  const mid = a1 + diff / 2;
  const lx = b[0] + (r + 9) * Math.cos(mid);
  const ly = b[1] + (r + 9) * Math.sin(mid);

  return (
    <g className="pose-arc">
      <path
        d={`M${sx} ${sy} A${r} ${r} 0 ${large} 1 ${ex} ${ey}`}
        fill="none"
        stroke="var(--accent-2)"
        strokeWidth="1.2"
        strokeDasharray="2 1.5"
      />
      <text
        x={lx}
        y={ly}
        fontSize="6.5"
        fill="var(--accent-2)"
        textAnchor="middle"
        dominantBaseline="middle"
        fontFamily="var(--font-body)"
        letterSpacing="0.05em"
      >
        {fig.focus.label}
      </text>
    </g>
  );
}

export default function PoseIllustration({
  kind,
  className,
}: {
  kind: PoseKind;
  className?: string;
}) {
  const fig = FIGURES[kind];

  return (
    <svg
      viewBox="0 0 100 100"
      className={`pose-illustration ${className ?? ""}`.trim()}
      role="img"
      aria-label={`${kind} pose illustration`}
    >
      <defs>
        <linearGradient id={`pose-grad-${kind}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent)" />
          <stop offset="100%" stopColor="var(--accent-2)" />
        </linearGradient>
      </defs>

      {fig.ground != null && (
        <line
          x1="6"
          x2="94"
          y1={fig.ground + 3}
          y2={fig.ground + 3}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.8"
          strokeDasharray="1.5 2"
        />
      )}

      {kind === "coach" && (
        <g className="pose-pulse">
          <circle cx="50" cy="56" r="30" fill="none" stroke="var(--accent-2)" strokeWidth="0.6" opacity="0.35" />
          <circle cx="50" cy="56" r="40" fill="none" stroke="var(--accent-2)" strokeWidth="0.5" opacity="0.18" />
        </g>
      )}

      <g
        stroke={`url(#pose-grad-${kind})`}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        {fig.bones.map(([s, e]) => {
          const [x1, y1] = fig.points[s];
          const [x2, y2] = fig.points[e];
          return <line key={`${s}-${e}`} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>

      <g fill="var(--bg)" stroke="var(--accent)" strokeWidth="1.4">
        {Object.entries(fig.points).map(([name, [x, y]]) => (
          <circle key={name} cx={x} cy={y} r={name === "head" ? 4.2 : 2.3} />
        ))}
      </g>

      {angleArc(fig)}
    </svg>
  );
}
