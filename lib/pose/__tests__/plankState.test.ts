import { describe, it, expect } from "vitest";
import {
  initialState,
  reduce,
  evaluatePose,
  Keypoint,
} from "../plankState";
import { KEYPOINT } from "@/lib/constants";

// Helper to construct a valid base keypoint set for the left side
function makeKeypoints(overrides: Partial<Record<number, Partial<Keypoint>>> = {}): Keypoint[] {
  const base: Keypoint[] = Array(17).fill(null).map(() => ({ x: 0, y: 0, score: 0 }));

  const leftPoints = {
    [KEYPOINT.LEFT_SHOULDER]: { x: 100, y: 100, score: 0.9 },
    [KEYPOINT.LEFT_ELBOW]: { x: 100, y: 180, score: 0.9 },
    [KEYPOINT.LEFT_WRIST]: { x: 100, y: 180, score: 0.9 },
    [KEYPOINT.LEFT_HIP]: { x: 200, y: 100, score: 0.9 },
    [KEYPOINT.LEFT_KNEE]: { x: 250, y: 100, score: 0.9 },
    [KEYPOINT.LEFT_ANKLE]: { x: 300, y: 100, score: 0.9 },
  };

  // Copy default leftPoints
  for (const [idxStr, val] of Object.entries(leftPoints)) {
    const idx = parseInt(idxStr);
    base[idx] = { ...val };
  }

  // Apply all overrides (including right side)
  for (const [idxStr, val] of Object.entries(overrides)) {
    const idx = parseInt(idxStr);
    base[idx] = { ...base[idx], ...val };
  }

  return base;
}

describe("evaluatePose Heuristics", () => {
  it("evaluates a perfect flat plank as valid", () => {
    const kps = makeKeypoints();
    const result = evaluatePose(kps);

    expect(result.formValid).toBe(true);
    expect(result.reason).toBe("ok");
    expect(result.side).toBe("left");
    expect(result.hipAngle).toBeCloseTo(180, 1);
    expect(result.frameQuality).toBeDefined();
  });

  it("rejects front-facing postures (Advanced Side-View Check)", () => {
    // Both shoulders visible with horizontal width = 60px (bodyLength = 200, so width > 10% limit)
    const kps = makeKeypoints({
      [KEYPOINT.RIGHT_SHOULDER]: { x: 160, y: 100, score: 0.9 },
    });
    const result = evaluatePose(kps);

    expect(result.formValid).toBe(false);
    expect(result.reason).toBe("body_not_side_on");
  });

  it("rejects when shoulder, hip, or ankle confidence is too low", () => {
    const kps = makeKeypoints({
      [KEYPOINT.LEFT_HIP]: { score: 0.2 },
    });
    const result = evaluatePose(kps);

    expect(result.formValid).toBe(false);
    expect(result.reason).toBe("body_not_visible");
  });

  it("rejects when body is too tilted (e.g. standing up)", () => {
    const kps = makeKeypoints({
      [KEYPOINT.LEFT_ANKLE]: { x: 100, y: 300, score: 0.9 },
    });
    const result = evaluatePose(kps);

    expect(result.formValid).toBe(false);
    expect(result.reason).toBe("body_not_horizontal");
  });

  it("rejects when body is not elevated (lying flat)", () => {
    const kps = makeKeypoints({
      [KEYPOINT.LEFT_ELBOW]: { x: 100, y: 105, score: 0.9 },
      [KEYPOINT.LEFT_WRIST]: { x: 100, y: 105, score: 0.9 },
    });
    const result = evaluatePose(kps);

    expect(result.formValid).toBe(false);
    expect(result.reason).toBe("body_not_elevated");
  });
});

describe("reducer state machine with rolling windows", () => {
  it("transitions IDLE -> READY on START event", () => {
    const state = reduce(initialState, { type: "START" });
    expect(state.kind).toBe("READY");
  });

  it("transitions READY -> IN_PLANK when valid pose is held", () => {
    let state = reduce(initialState, { type: "START" });
    const kps = makeKeypoints();

    state = reduce(state, { type: "POSE", keypoints: kps, dtMs: 200 });
    expect(state.kind).toBe("READY");

    state = reduce(state, { type: "POSE", keypoints: kps, dtMs: 350 });
    expect(state.kind).toBe("IN_PLANK");
    expect(state.recentValidities).toEqual([true]);
  });

  it("dampens single invalid frame jitters (rolling window consensus)", () => {
    let state = reduce(initialState, { type: "START" });
    const validKps = makeKeypoints();
    const invalidKps = makeKeypoints({
      [KEYPOINT.LEFT_HIP]: { x: 200, y: 250 }, // Hips sagged
    });

    // Feed 15 valid frames to build robust consensus history (similar to calibration)
    for (let i = 0; i < 15; i++) {
      state = reduce(state, { type: "POSE", keypoints: validKps, dtMs: 200 });
    }
    expect(state.kind).toBe("IN_PLANK");

    // Feed 1 single invalid frame
    state = reduce(state, { type: "POSE", keypoints: invalidKps, dtMs: 200 });
    
    // Consensus remains valid (14 valid out of 15 total frames, density >= 11/15)
    // The single bad frame is successfully filtered, state remains IN_PLANK!
    expect(state.kind).toBe("IN_PLANK");
  });

  it("transitions IN_PLANK -> WARNING only after multiple bad frames degrade consensus", () => {
    let state = reduce(initialState, { type: "START" });
    const validKps = makeKeypoints();
    const invalidKps = makeKeypoints({
      [KEYPOINT.LEFT_HIP]: { x: 200, y: 250 },
    });

    // Feed 15 valid frames
    for (let i = 0; i < 15; i++) {
      state = reduce(state, { type: "POSE", keypoints: validKps, dtMs: 200 });
    }
    
    // Feed 5 consecutive invalid frames in a row (degrades validCount to 10/15, below consensus floor of 11/15)
    for (let i = 0; i < 5; i++) {
      state = reduce(state, { type: "POSE", keypoints: invalidKps, dtMs: 200 });
    }
    
    expect(state.kind).toBe("WARNING");
  });

  it("transitions WARNING -> IN_PLANK (increments breaksCount) on recovery", () => {
    let state = reduce(initialState, { type: "START" });
    const validKps = makeKeypoints();
    const invalidKps = makeKeypoints({
      [KEYPOINT.LEFT_HIP]: { x: 200, y: 250 },
    });

    // Go to WARNING
    for (let i = 0; i < 5; i++) {
      state = reduce(state, { type: "POSE", keypoints: validKps, dtMs: 200 });
    }
    for (let i = 0; i < 5; i++) {
      state = reduce(state, { type: "POSE", keypoints: invalidKps, dtMs: 200 });
    }
    expect(state.kind).toBe("WARNING");

    // Feed 11 valid frames to climb back over consensus threshold (11/15)
    for (let i = 0; i < 11; i++) {
      state = reduce(state, { type: "POSE", keypoints: validKps, dtMs: 200 });
    }

    expect(state.kind).toBe("IN_PLANK");
    expect(state.breaksCount).toBe(1);
  });

  it("transitions WARNING -> DISQUALIFIED if held past hold window", () => {
    let state = reduce(initialState, { type: "START" });
    const validKps = makeKeypoints();
    const invalidKps = makeKeypoints({
      [KEYPOINT.LEFT_HIP]: { x: 200, y: 250 },
    });

    // Enter IN_PLANK and accumulate 11s valid time
    state = reduce(state, { type: "POSE", keypoints: validKps, dtMs: 600 });
    state = reduce(state, { type: "POSE", keypoints: validKps, dtMs: 11000 });

    // Transition to WARNING
    for (let i = 0; i < 5; i++) {
      state = reduce(state, { type: "POSE", keypoints: invalidKps, dtMs: 200 });
    }
    expect(state.kind).toBe("WARNING");

    // Exceed hold time of 8 seconds while remaining in WARNING state
    state = reduce(state, { type: "POSE", keypoints: invalidKps, dtMs: 8000 });

    expect(state.kind).toBe("DISQUALIFIED");
  });
});
