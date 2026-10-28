import Link from "next/link";
import { ArrowRight } from "../components/Icons";
import Logo from "../components/Logo";

export default function NotFound() {
  return (
    <>
      <div className="ambient" aria-hidden="true" />
      <main id="main" className="notfound">
        <Logo />
        <h1>404</h1>
        <p>That page isn&apos;t in frame. Head back home or jump straight into a workout.</p>
        <div className="cta-row">
          <Link href="/" className="btn-ghost">
            Back home
          </Link>
          <Link href="/coach" className="btn-primary">
            Open the coach <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    </>
  );
}
