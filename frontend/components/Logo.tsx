import Link from "next/link";

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h3l2.5-6 4 12 2.5-6H21" />
      </svg>
    </span>
  );
}

export default function Logo({ href = "/", size = 24 }: { href?: string; size?: number }) {
  return (
    <Link href={href} className="logo" aria-label="PosePulse home">
      <LogoMark size={size} />
      <span className="logo-word">PosePulse</span>
    </Link>
  );
}
