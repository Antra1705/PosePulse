import type { Metadata } from "next";
import { Instrument_Serif, Ubuntu } from "next/font/google";
import "./globals.css";

const instrumentSerif = Instrument_Serif({
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-instrument",
});

const ubuntu = Ubuntu({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-ubuntu",
});

export const metadata: Metadata = {
  title: "PosePulse — Real-time AI Gym Coach",
  description:
    "Your form. Analyzed. Corrected. In milliseconds. Computer vision that watches every rep and tells you exactly what to fix.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${instrumentSerif.variable} ${ubuntu.variable}`}>
        {children}
      </body>
    </html>
  );
}
