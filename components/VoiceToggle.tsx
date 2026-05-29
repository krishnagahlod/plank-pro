"use client";

import { useEffect, useState } from "react";
import { announcer } from "@/lib/voice/announcer";

const STORAGE_KEY = "pp_voice_enabled";

type Props = {
  /** Visual variant — `overlay` is the semi-transparent version used over a camera. */
  variant?: "default" | "overlay";
};

export default function VoiceToggle({ variant = "default" }: Props) {
  // Optimistic default: ON. Real value is hydrated from localStorage in the effect.
  const [enabled, setEnabled] = useState(true);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!announcer.isSupported()) {
      setSupported(false);
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const initial = stored === null ? true : stored === "true";
      setEnabled(initial);
      announcer.setEnabled(initial);
    } catch {
      // localStorage may be blocked in private mode — fall back to default ON.
      announcer.setEnabled(true);
    }
  }, []);

  if (!supported) return null;

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    announcer.setEnabled(next);
    try {
      localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      // ignore
    }
  };

  const baseClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";
  const variantClass =
    variant === "overlay"
      ? "bg-zinc-950/70 text-zinc-100 ring-1 ring-zinc-700/60 backdrop-blur hover:bg-zinc-900/80"
      : "border border-zinc-700 bg-zinc-900/60 text-zinc-200 hover:border-zinc-500 hover:text-white";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Mute voice prompts" : "Enable voice prompts"}
      title={enabled ? "Mute voice" : "Enable voice"}
      className={`${baseClass} ${variantClass}`}
    >
      {enabled ? <SpeakerOnIcon /> : <SpeakerOffIcon />}
    </button>
  );
}

function SpeakerOnIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 010 7" />
      <path d="M18 6a8 8 0 010 12" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 5L6 9H3v6h3l5 4V5z" />
      <path d="M16 9l5 6" />
      <path d="M21 9l-5 6" />
    </svg>
  );
}
