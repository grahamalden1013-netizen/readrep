import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ngn.example.com"),
  title: {
    default: "NGN — Next Gen News",
    template: "%s · NGN",
  },
  description:
    "Understand what's happening. Decide what you think. Political news made understandable for the next generation.",
  openGraph: {
    siteName: "NGN — Next Gen News",
    type: "website",
    title: "NGN — Next Gen News",
    description:
      "Understand what's happening. Decide what you think. Political news made understandable for the next generation.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0c0e" },
  ],
};

/**
 * Resolves the reader's theme before first paint so the page never flashes the
 * wrong palette. Falls back silently when storage is unavailable.
 */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('ngn-theme');if(t!=='dark'&&t!=='light'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-paper text-ink">{children}</body>
    </html>
  );
}
