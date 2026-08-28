import type { Metadata, Viewport } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { ArenaProvider } from "@/components/providers/ArenaProvider";
import "./globals.css";

/**
 * Type system:
 *   Fraunces  — editorial serif for headlines and article bodies
 *   Inter     — UI sans for interface text
 *   JetBrains — tabular figures for ratings, scores and timers
 */

const editorial = Fraunces({
  variable: "--font-editorial",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

const ui = Inter({
  variable: "--font-ui",
  subsets: ["latin"],
  display: "swap",
});

const numeric = JetBrains_Mono({
  variable: "--font-numeric",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NGN Arena — Don't just have an opinion. Defend it.",
    template: "%s · NGN",
  },
  description:
    "NGN Arena is a competitive debate platform for students. Understand the issue. Make your case. Hear the other side.",
  applicationName: "NGN",
};

export const viewport: Viewport = {
  themeColor: "#faf7f0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${editorial.variable} ${ui.variable} ${numeric.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-paper text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-ink-inverse"
        >
          Skip to content
        </a>
        <ArenaProvider>{children}</ArenaProvider>
      </body>
    </html>
  );
}
