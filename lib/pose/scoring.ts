import { FORM } from "@/lib/constants";

export type AttemptScore = {
  totalSeconds: number;
  validSeconds: number;
  formScore: number; // 0–100, average frame quality
  stabilityScore: number; // 0–100, derived from hip-angle variance
  breaksCount: number;
  combinedScore: number;
  scoring_version?: string;
  model_version?: string;
  metrics?: {
    avgHipQuality: number;
    avgKneeQuality: number;
    avgArmQuality: number;
    avgTiltQuality: number;
    avgConfidence: number;
  };
};

export type ScoreInputs = {
  totalSeconds: number;
  validSeconds: number;
  qualitySum: number;
  qualityFrames: number;
  hipAngleSum: number;
  hipAngleSumSq: number;
  breaksCount: number;
  hipQualitySum?: number;
  kneeQualitySum?: number;
  armQualitySum?: number;
  tiltQualitySum?: number;
  confidenceSum?: number;
};

export function computeScore(inputs: ScoreInputs): AttemptScore {
  const safeTotal = Math.max(inputs.totalSeconds, 0);
  const safeValid = Math.max(Math.min(inputs.validSeconds, safeTotal), 0);

  // Average frame quality across the valid frames of the attempt.
  // Falls back to 0 if no valid frames were recorded.
  const qualityAvg =
    inputs.qualityFrames > 0
      ? Math.max(0, Math.min(1, inputs.qualitySum / inputs.qualityFrames))
      : 0;

  // Stability: lower hip-angle variance → higher score. Uses Welford-style
  // mean + sum-of-squares to compute std deviation.
  let stabilityRatio = 0;
  if (inputs.qualityFrames > 1) {
    const mean = inputs.hipAngleSum / inputs.qualityFrames;
    const variance = Math.max(
      0,
      inputs.hipAngleSumSq / inputs.qualityFrames - mean * mean,
    );
    const stdDev = Math.sqrt(variance);
    stabilityRatio =
      1 - Math.max(0, Math.min(1, stdDev / FORM.STABILITY_FULL_LOSS_DEG));
  } else if (inputs.qualityFrames === 1) {
    // A single frame has no variance; treat it as fully stable.
    stabilityRatio = 1;
  }

  // Soft pause penalty.
  const breakPenalty = Math.max(
    0,
    Math.min(
      FORM.BREAK_PENALTY_CAP,
      inputs.breaksCount * FORM.BREAK_PENALTY_PER,
    ),
  );

  // Combined: duration (linear) × √quality × (0.85 + 0.15·stability) × (1 − breakPenalty).
  // Square-rooting quality keeps duration the dominant factor (matches the
  // original "60s @ 50% beats 30s @ 100%" intent) while still rewarding form.
  const combinedRaw =
    safeValid *
    Math.sqrt(qualityAvg) *
    (0.85 + 0.15 * stabilityRatio);
  const combinedScore = combinedRaw * (1 - breakPenalty);

  const avgHipQuality =
    inputs.qualityFrames > 0
      ? (inputs.hipQualitySum ?? inputs.qualitySum) / inputs.qualityFrames
      : 0;
  const avgKneeQuality =
    inputs.qualityFrames > 0
      ? (inputs.kneeQualitySum ?? inputs.qualitySum) / inputs.qualityFrames
      : 0;
  const avgArmQuality =
    inputs.qualityFrames > 0
      ? (inputs.armQualitySum ?? inputs.qualitySum) / inputs.qualityFrames
      : 0;
  const avgTiltQuality =
    inputs.qualityFrames > 0
      ? (inputs.tiltQualitySum ?? inputs.qualitySum) / inputs.qualityFrames
      : 0;
  const avgConfidence =
    inputs.qualityFrames > 0
      ? (inputs.confidenceSum ?? inputs.qualityFrames * 0.9) / inputs.qualityFrames
      : 0;

  return {
    totalSeconds: round2(safeTotal),
    validSeconds: round2(safeValid),
    formScore: round2(qualityAvg * 100),
    stabilityScore: round2(stabilityRatio * 100),
    breaksCount: inputs.breaksCount,
    combinedScore: round2(combinedScore),
    scoring_version: "1.2.0",
    model_version: "movenet_lightning_v1",
    metrics: {
      avgHipQuality: round2(avgHipQuality),
      avgKneeQuality: round2(avgKneeQuality),
      avgArmQuality: round2(avgArmQuality),
      avgTiltQuality: round2(avgTiltQuality),
      avgConfidence: round2(avgConfidence),
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
