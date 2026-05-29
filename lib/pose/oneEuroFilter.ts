/**
 * One Euro Filter — adaptive low-pass filter for noisy real-time signals.
 *
 * The classic problem with smoothing pose keypoints is that a fixed-strength
 * filter has to trade jitter against lag: too weak and the values jitter at
 * rest, too strong and they drag behind real motion.
 *
 * The One Euro Filter solves this by *adapting* its cutoff frequency to the
 * signal's velocity. When you're holding still, velocity is low, so the
 * cutoff drops and we smooth heavily. When you move quickly, velocity rises,
 * the cutoff rises with it, and the filter steps out of the way.
 *
 * Reference: Casiez et al., CHI 2012 — "1€ Filter: A Simple Speed-based
 * Low-pass Filter for Noisy Input in Interactive Systems".
 *
 * Used by MediaPipe and MMPose for pose-keypoint smoothing.
 */
export class OneEuroFilter {
  private lastTimeMs: number | null = null;
  private lastValue = 0;
  private lastDerivative = 0;

  constructor(
    /** Minimum cutoff frequency in Hz. Lower → less jitter at rest, more lag. */
    private readonly minCutoff: number,
    /** Velocity gain. Higher → faster response to quick motion. */
    private readonly beta: number,
    /** Cutoff for the derivative low-pass. Default 1.0 works for most signals. */
    private readonly dCutoff: number = 1.0,
  ) {}

  filter(value: number, timeMs: number): number {
    if (this.lastTimeMs === null) {
      this.lastTimeMs = timeMs;
      this.lastValue = value;
      this.lastDerivative = 0;
      return value;
    }

    const dtSec = Math.max((timeMs - this.lastTimeMs) / 1000, 1e-4);
    this.lastTimeMs = timeMs;

    // Smoothed velocity.
    const rawDerivative = (value - this.lastValue) / dtSec;
    const aDeriv = alpha(this.dCutoff, dtSec);
    const derivative =
      aDeriv * rawDerivative + (1 - aDeriv) * this.lastDerivative;
    this.lastDerivative = derivative;

    // Adapt the cutoff: faster signal → higher cutoff → less smoothing.
    const cutoff = this.minCutoff + this.beta * Math.abs(derivative);
    const a = alpha(cutoff, dtSec);
    const smoothed = a * value + (1 - a) * this.lastValue;
    this.lastValue = smoothed;
    return smoothed;
  }

  reset(): void {
    this.lastTimeMs = null;
    this.lastValue = 0;
    this.lastDerivative = 0;
  }
}

function alpha(cutoffHz: number, dtSec: number): number {
  const r = 2 * Math.PI * cutoffHz * dtSec;
  return r / (r + 1);
}
