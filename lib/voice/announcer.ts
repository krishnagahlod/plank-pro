/**
 * Voice announcer — thin wrapper around the browser's Web Speech API.
 *
 * Strategy:
 *   • Singleton (instantiated once per session in the module).
 *   • Categories with cooldowns so the same kind of message can't spam.
 *   • Pre-selects an English voice when the browser fires `voiceschanged`
 *     (iOS Safari populates the voice list asynchronously).
 *   • First `speak()` MUST come from a user gesture on iOS Safari — callers
 *     should ensure the very first announce() call happens inside a click
 *     handler chain (the Start button covers this).
 *   • No external dependency, no API key, fully on-device.
 */

export type VoiceCategory =
  | "start"
  | "transition"
  | "warn"
  | "milestone"
  | "end";

type SpeakOptions = {
  rate?: number;
  pitch?: number;
  volume?: number;
};

const COOLDOWN_MS: Record<VoiceCategory, number> = {
  start: 0,
  transition: 3000,
  warn: 5000,
  milestone: 0,
  end: 0,
};

// Categories that should flush anything already in flight before they speak.
const PREEMPT_QUEUE: ReadonlySet<VoiceCategory> = new Set<VoiceCategory>([
  "warn",
  "end",
]);

class Announcer {
  private enabled = true;
  private lastSpokenAt = new Map<VoiceCategory, number>();
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private voicesBound = false;

  isSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"
    );
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (!on) this.cancel();
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /** Speak `text`, subject to the category cooldown and the enabled flag. */
  announce(category: VoiceCategory, text: string, opts?: SpeakOptions): void {
    if (!this.enabled || !this.isSupported() || !text) return;

    const now = Date.now();
    const last = this.lastSpokenAt.get(category) ?? 0;
    if (now - last < COOLDOWN_MS[category]) return;
    this.lastSpokenAt.set(category, now);

    this.ensureVoicesBound();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = opts?.rate ?? 1.0;
    utterance.pitch = opts?.pitch ?? 1.0;
    utterance.volume = opts?.volume ?? 1.0;
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
      utterance.lang = this.selectedVoice.lang;
    } else {
      utterance.lang = "en-US";
    }

    if (PREEMPT_QUEUE.has(category)) {
      window.speechSynthesis.cancel();
    }

    try {
      window.speechSynthesis.speak(utterance);
    } catch {
      // Some browsers throw if the page is hidden or the audio context is
      // suspended — silently swallow; the next attempt will retry.
    }
  }

  /** Reset cooldown bookkeeping — call when starting a fresh attempt. */
  resetCooldowns(): void {
    this.lastSpokenAt.clear();
  }

  /** Stop any in-flight or queued utterance. */
  cancel(): void {
    if (!this.isSupported()) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  private ensureVoicesBound(): void {
    if (this.voicesBound || !this.isSupported()) return;
    this.voicesBound = true;
    this.pickVoice();
    // iOS Safari + some Chromiums populate voices asynchronously.
    window.speechSynthesis.addEventListener?.("voiceschanged", () => {
      this.pickVoice();
    });
  }

  private pickVoice(): void {
    if (!this.isSupported()) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return;

    // Prefer en-US, then any English, then whatever is first.
    const enUs = voices.find((v) => v.lang === "en-US" && v.default);
    if (enUs) {
      this.selectedVoice = enUs;
      return;
    }
    const anyEnUs = voices.find((v) => v.lang === "en-US");
    if (anyEnUs) {
      this.selectedVoice = anyEnUs;
      return;
    }
    const anyEn = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
    if (anyEn) {
      this.selectedVoice = anyEn;
      return;
    }
    this.selectedVoice = voices[0];
  }
}

export const announcer = new Announcer();

/** Pretty-print a milestone for speech. */
export function milestoneText(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds % 60 === 0) {
    const minutes = seconds / 60;
    return minutes === 1 ? "1 minute" : `${minutes} minutes`;
  }
  return `${seconds} seconds`;
}
