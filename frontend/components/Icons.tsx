import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
}

export const ArrowRight = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </svg>
);

export const ArrowDown = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 4v16M6 14l6 6 6-6" />
  </svg>
);

export const Camera = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-2h6.4l1.1 2h1.2A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" />
    <circle cx="12" cy="12.5" r="3.5" />
  </svg>
);

export const Skeleton = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M12 6.5v6M12 12.5l-3.5 7M12 12.5l3.5 7M7 9.5l5-1.5 5 1.5" />
  </svg>
);

export const Waveform = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3 12h2M7 8v8M11 5v14M15 9v6M19 7v10M21 12h0" />
  </svg>
);

export const Counter = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <path d="M8 9.5v5M12 9.5v5M16 9.5v5M6 14.5l8-5" />
  </svg>
);

export const Bolt = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13 2.5 4.5 13.5H11l-1 8 8.5-11H12z" />
  </svg>
);

export const Shield = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 3 5 6v5.5c0 4.4 3 8 7 9.5 4-1.5 7-5.1 7-9.5V6z" />
    <path d="m9.5 12 1.8 1.8L15 10" />
  </svg>
);

export const History = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4.5h4.5" />
    <path d="M12 8v4.5l3 1.8" />
  </svg>
);

export const Brain = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.5 4A3 3 0 0 0 6 7.5 3 3 0 0 0 4.5 12 3 3 0 0 0 6 16.5 3 3 0 0 0 9.5 20c1 0 2-.5 2.5-1.5M14.5 4A3 3 0 0 1 18 7.5a3 3 0 0 1 1.5 4.5 3 3 0 0 1-1.5 4.5 3 3 0 0 1-3.5 3.5c-1 0-2-.5-2.5-1.5M12 4v14" />
  </svg>
);

export const Github = (p: IconProps) => (
  <svg {...base(p)} stroke="none" fill="currentColor">
    <path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.2-3.4-1.2-.4-1.1-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.2-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.7.7 1 1.6 1 2.7 0 3.9-2.4 4.8-4.6 5 .4.3.7 1 .7 1.9v2.9c0 .3.2.6.7.5A10 10 0 0 0 12 2z" />
  </svg>
);

export const Linkedin = (p: IconProps) => (
  <svg {...base(p)} stroke="none" fill="currentColor">
    <path d="M6.5 8.5H3.6V20h2.9zM5 7.2a1.7 1.7 0 1 0 0-3.4 1.7 1.7 0 0 0 0 3.4zM20.4 20h-2.9v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V20H10.6V8.5h2.8v1.6c.4-.7 1.3-1.8 3-1.8 3.2 0 3.9 2.1 3.9 4.9z" />
  </svg>
);

export const Mail = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

export const Menu = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </svg>
);

export const Close = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Check = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const Play = (p: IconProps) => (
  <svg {...base(p)} stroke="none" fill="currentColor">
    <path d="M8 5.5v13l10-6.5z" />
  </svg>
);

export const Stop = (p: IconProps) => (
  <svg {...base(p)} stroke="none" fill="currentColor">
    <rect x="6" y="6" width="12" height="12" rx="1.5" />
  </svg>
);

export const Logout = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10 4H6.5A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20H10M15 8l4 4-4 4M19 12H9" />
  </svg>
);

export const Spinner = (p: IconProps) => (
  <svg {...base(p)} className={`spin ${p.className ?? ""}`.trim()}>
    <path d="M12 3a9 9 0 1 0 9 9" />
  </svg>
);

export const Wifi = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.5 16a5.5 5.5 0 0 1 7 0" />
    <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
  </svg>
);
