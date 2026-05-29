import type { Metadata } from "next";
import localFont from "next/font/local";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Plank-Pro — Selection Portal",
    template: "%s · Plank-Pro",
  },
  description:
    "Online selection round for Plank-Pro, the plank-based endurance sports league. Record a webcam plank, get scored live, hit the leaderboard.",
  applicationName: "Plank-Pro",
  openGraph: {
    title: "Plank-Pro — Selection Portal",
    description:
      "Hold the line. Make the cut. Record a webcam plank, get scored by AI, hit the leaderboard.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* The MoveNet model is fetched lazily from tfhub.dev (which redirects
            to storage.googleapis.com) the first time the user opens /record.
            Resolving DNS for both hosts up-front shaves ~100–300 ms off that
            first model fetch on cellular networks. */}
        <link rel="dns-prefetch" href="https://tfhub.dev" />
        <link rel="dns-prefetch" href="https://storage.googleapis.com" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <main className="flex-grow flex flex-col">
          {children}
        </main>
        <Footer />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
