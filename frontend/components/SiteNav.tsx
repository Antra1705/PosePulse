"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Logo from "./Logo";
import { ArrowRight, Close, Github, Menu } from "./Icons";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#exercises", label: "Exercises" },
  { href: "#faq", label: "FAQ" },
];

export default function SiteNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`nav ${scrolled ? "nav--scrolled" : ""}`}>
      <div className="nav-inner">
        <Logo />

        <nav className="nav-links" aria-label="Primary">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav-actions">
          <a
            href="https://github.com/Antra1705/PosePulse"
            target="_blank"
            rel="noopener noreferrer"
            className="nav-icon-btn"
            aria-label="PosePulse on GitHub"
          >
            <Github size={18} />
          </a>
          <Link href="/coach" className="btn-primary btn-sm nav-cta">
            Start a workout
            <ArrowRight size={15} />
          </Link>
          <button
            type="button"
            className="nav-icon-btn nav-menu-btn"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <Close size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <div id="mobile-menu" className="mobile-menu" hidden={!open}>
        {LINKS.map((l) => (
          <a key={l.href} href={l.href} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <Link href="/coach" className="btn-primary btn-block" onClick={() => setOpen(false)}>
          Start a workout
          <ArrowRight size={16} />
        </Link>
      </div>
    </header>
  );
}
