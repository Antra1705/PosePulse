import type { Metadata } from "next";
import CoachApp from "./CoachApp";

export const metadata: Metadata = {
  title: "Live Coach",
  description:
    "Turn on your camera and get real-time rep counting and spoken form corrections.",
  robots: { index: false },
};

export default function CoachPage() {
  return <CoachApp />;
}
