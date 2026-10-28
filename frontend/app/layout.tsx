import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { API_BASE } from "../lib/api";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://posepulse.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PosePulse — Real-time AI Gym Coach",
    template: "%s · PosePulse",
  },
  description:
    "PosePulse watches your form through your webcam, counts every rep, and coaches you out loud in real time. Squats, push-ups, curls, presses and lunges — no hardware, just a browser.",
  keywords: [
    "AI gym coach",
    "pose estimation",
    "form correction",
    "rep counter",
    "MediaPipe",
    "computer vision fitness",
  ],
  authors: [{ name: "Antra Singh", url: "https://github.com/Antra1705" }],
  openGraph: {
    type: "website",
    siteName: "PosePulse",
    title: "PosePulse — Real-time AI Gym Coach",
    description:
      "Real-time form coaching, powered by computer vision. Counts your reps and speaks a correction the moment your form slips.",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "PosePulse — Real-time AI Gym Coach",
    description: "Real-time form coaching, powered by computer vision.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={inter.variable}>
      <head>
        {/* Open the TLS connection to the coach API early; the first real
            request (health ping / login) then skips the handshake. */}
        <link rel="preconnect" href={API_BASE} crossOrigin="anonymous" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
