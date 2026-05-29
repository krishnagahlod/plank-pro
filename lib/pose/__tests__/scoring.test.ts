import { describe, it, expect } from "vitest";
import { computeScore, ScoreInputs } from "../scoring";

describe("computeScore", () => {
  it("computes scores for a perfect attempt correctly", () => {
    const inputs: ScoreInputs = {
      totalSeconds: 10,
      validSeconds: 10,
      qualitySum: 10,
      qualityFrames: 10,
      hipAngleSum: 1800,
      hipAngleSumSq: 324000,
      breaksCount: 0,
      // Granular inputs
      hipQualitySum: 10,
      kneeQualitySum: 10,
      armQualitySum: 10,
      tiltQualitySum: 10,
      confidenceSum: 5, // avg confidence = 0.5
    };

    const score = computeScore(inputs);
    expect(score.totalSeconds).toBe(10);
    expect(score.validSeconds).toBe(10);
    expect(score.formScore).toBe(100);
    expect(score.stabilityScore).toBe(100);
    expect(score.breaksCount).toBe(0);
    expect(score.combinedScore).toBe(10); // 10 * 1 * (0.85 + 0.15 * 1) = 10
    
    // Telemetry Assertions
    expect(score.scoring_version).toBe("1.2.0");
    expect(score.model_version).toBe("movenet_lightning_v1");
    expect(score.metrics).toBeDefined();
    expect(score.metrics?.avgHipQuality).toBe(1.0);
    expect(score.metrics?.avgConfidence).toBe(0.5);
  });

  it("computes scores for a high variance (unstable hip) attempt correctly", () => {
    const inputs: ScoreInputs = {
      totalSeconds: 10,
      validSeconds: 10,
      qualitySum: 2,
      qualityFrames: 2,
      hipAngleSum: 360,
      hipAngleSumSq: 65250,
      breaksCount: 0,
    };

    const score = computeScore(inputs);
    expect(score.formScore).toBe(100);
    expect(score.stabilityScore).toBe(0);
    expect(score.combinedScore).toBe(8.5); // 10 * 1 * (0.85 + 0.15 * 0) = 8.5
  });

  it("applies standard and capped break penalties correctly", () => {
    const perfectInputs: ScoreInputs = {
      totalSeconds: 10,
      validSeconds: 10,
      qualitySum: 10,
      qualityFrames: 10,
      hipAngleSum: 1800,
      hipAngleSumSq: 324000,
      breaksCount: 0,
    };

    const score1Break = computeScore({ ...perfectInputs, breaksCount: 1 });
    expect(score1Break.combinedScore).toBe(9.5);

    const score6Breaks = computeScore({ ...perfectInputs, breaksCount: 6 });
    expect(score6Breaks.combinedScore).toBe(7);

    const score8Breaks = computeScore({ ...perfectInputs, breaksCount: 8 });
    expect(score8Breaks.combinedScore).toBe(7);
  });

  it("handles a single-frame attempt correctly (stability treated as 100%)", () => {
    const inputs: ScoreInputs = {
      totalSeconds: 1,
      validSeconds: 1,
      qualitySum: 1,
      qualityFrames: 1,
      hipAngleSum: 180,
      hipAngleSumSq: 32400,
      breaksCount: 0,
    };

    const score = computeScore(inputs);
    expect(score.stabilityScore).toBe(100);
    expect(score.combinedScore).toBe(1);
  });

  it("returns zero combined score when there are zero valid seconds", () => {
    const inputs: ScoreInputs = {
      totalSeconds: 10,
      validSeconds: 0,
      qualitySum: 0,
      qualityFrames: 0,
      hipAngleSum: 0,
      hipAngleSumSq: 0,
      breaksCount: 0,
    };

    const score = computeScore(inputs);
    expect(score.combinedScore).toBe(0);
    expect(score.formScore).toBe(0);
    expect(score.stabilityScore).toBe(0);
  });
});
