import { FORM, KEYPOINT } from "@/lib/constants";
import { getAngle } from "@/lib/pose/angles";

export type Keypoint = { x: number; y: number; score?: number; name?: string };

export type StateKind =
  | "IDLE"
  | "READY"
  | "IN_PLANK"
  | "WARNING"
  | "COMPLETED"
  | "DISQUALIFIED";

export type PoseReason =
  | "ok"
  | "body_not_visible"
  | "body_not_horizontal"
  | "body_not_elevated"
  | "hip_angle_out_of_range"
  | "body_not_side_on";

export type PlankState = {
  kind: StateKind;
  totalSeconds: number;
  validSeconds: number;
  violationSeconds: number;
  readyHoldSeconds: number;
  lastHipAngle: number | null;
  lastSide: "left" | "right" | null;
  lastReason: PoseReason | null;
  // Continuous-quality accumulators (used by scoring.computeScore at attempt end).
  qualitySum: number; // sum of frameQuality across IN_PLANK frames
  qualityFrames: number; // count of IN_PLANK frames contributing
  hipAngleSum: number; // sum of hipAngle during IN_PLANK (for stability)
  hipAngleSumSq: number; // sum of hipAngle² during IN_PLANK (for stability)
  breaksCount: number; // # of WARNING → IN_PLANK transitions
  recentValidities: boolean[]; // Rolling validity history (max 15 frames)
  hipQualitySum: number;
  kneeQualitySum: number;
  armQualitySum: number;
  tiltQualitySum: number;
  confidenceSum: number;
};

export const initialState: PlankState = {
  kind: "IDLE",
  totalSeconds: 0,
  validSeconds: 0,
  violationSeconds: 0,
  readyHoldSeconds: 0,
  lastHipAngle: null,
  lastSide: null,
  lastReason: null,
  qualitySum: 0,
  qualityFrames: 0,
  hipAngleSum: 0,
  hipAngleSumSq: 0,
  breaksCount: 0,
  recentValidities: [],
  hipQualitySum: 0,
  kneeQualitySum: 0,
  armQualitySum: 0,
  tiltQualitySum: 0,
  confidenceSum: 0,
};

export type PlankEvent =
  | { type: "START" }
  | { type: "STOP" }
  | { type: "RESET" }
  | { type: "POSE"; keypoints: Keypoint[]; dtMs: number };

export type EvalResult = {
  reason: PoseReason;
  formValid: boolean;
  side: "left" | "right" | null;
  hipAngle: number | null;
  kneeAngle: number | null;
  bodyTiltDeg: number | null;
  elevationRatio: number | null;
  armBodyAngle: number | null;
  elbowAlignment: number | null; // 0–1, elbow-under-shoulder rule
  frameQuality: number | null; // 0–1, continuous per-frame form score
  shoulderScore: number;
  elbowScore: number;
  wristScore: number;
  hipScore: number;
  kneeScore: number;
  ankleScore: number;
};

const EMPTY_EVAL: EvalResult = {
  reason: "body_not_visible",
  formValid: false,
  side: null,
  hipAngle: null,
  kneeAngle: null,
  bodyTiltDeg: null,
  elevationRatio: null,
  armBodyAngle: null,
  elbowAlignment: null,
  frameQuality: null,
  shoulderScore: 0,
  elbowScore: 0,
  wristScore: 0,
  hipScore: 0,
  kneeScore: 0,
  ankleScore: 0,
};

export function reduce(state: PlankState, event: PlankEvent): PlankState {
  switch (event.type) {
    case "START":
      return { ...initialState, kind: "READY" };
    case "STOP":
      if (state.kind === "IN_PLANK" || state.kind === "WARNING") {
        return { ...state, kind: "COMPLETED" };
      }
      return state;
    case "RESET":
      return initialState;
    case "POSE":
      return handlePose(state, event.keypoints, event.dtMs);
  }
}

/**
 * Pure pose evaluation. Exported so the camera overlay and live-signals
 * panel can show diagnostics without going through the reducer.
 */
export function evaluatePose(kps: Keypoint[]): EvalResult {
  if (!kps || kps.length === 0) return EMPTY_EVAL;

  const candidates = [
    {
      side: "left" as const,
      shoulder: kps[KEYPOINT.LEFT_SHOULDER],
      elbow: kps[KEYPOINT.LEFT_ELBOW],
      wrist: kps[KEYPOINT.LEFT_WRIST],
      hip: kps[KEYPOINT.LEFT_HIP],
      knee: kps[KEYPOINT.LEFT_KNEE],
      ankle: kps[KEYPOINT.LEFT_ANKLE],
    },
    {
      side: "right" as const,
      shoulder: kps[KEYPOINT.RIGHT_SHOULDER],
      elbow: kps[KEYPOINT.RIGHT_ELBOW],
      wrist: kps[KEYPOINT.RIGHT_WRIST],
      hip: kps[KEYPOINT.RIGHT_HIP],
      knee: kps[KEYPOINT.RIGHT_KNEE],
      ankle: kps[KEYPOINT.RIGHT_ANKLE],
    },
  ];

  let best:
    | (typeof candidates)[number] & { avg: number; effectiveAnkle: Keypoint }
    | null = null;

  for (const c of candidates) {
    if (!c.shoulder || !c.hip) continue;
    const sh = c.shoulder.score ?? 0;
    const hp = c.hip.score ?? 0;
    
    let effectiveAnkle = c.ankle;
    let an = c.ankle.score ?? 0;
    if (an < FORM.MIN_CONFIDENCE && c.knee && (c.knee.score ?? 0) >= FORM.MIN_CONFIDENCE) {
        effectiveAnkle = c.knee;
        an = c.knee.score ?? 0;
    }

    if (sh < FORM.MIN_CONFIDENCE) continue;
    if (hp < FORM.MIN_CONFIDENCE) continue;
    if (an < FORM.MIN_CONFIDENCE) continue;
    const avg = (sh + hp + an) / 3;
    if (best === null || avg > best.avg) {
      best = { ...c, avg, effectiveAnkle };
    }
  }

  if (!best) return EMPTY_EVAL;

  const { shoulder, elbow, wrist, hip, knee, ankle, side, effectiveAnkle } = best;
  const shoulderScore = shoulder.score ?? 0;
  const elbowScore = elbow?.score ?? 0;
  const wristScore = wrist?.score ?? 0;
  const hipScore = hip.score ?? 0;
  const kneeScore = knee?.score ?? 0;
  const ankleScore = ankle.score ?? 0;

  const dx = effectiveAnkle.x - shoulder.x;
  const dy = effectiveAnkle.y - shoulder.y;
  const dxAbs = Math.max(Math.abs(dx), 1);
  const tiltRatio = Math.abs(dy) / dxAbs;
  const bodyTiltDeg = (Math.atan2(Math.abs(dy), dxAbs) * 180) / Math.PI;
  const bodyLength = Math.hypot(dx, dy);

  // Advanced Side-View Check (Anti-Cheat / Calibration Gate)
  // If both shoulders or both hips are visible, their horizontal distance
  // should be small relative to bodyLength. Width > 20% indicates front/diagonal prop.
  const otherShoulder = side === "left" ? kps[KEYPOINT.RIGHT_SHOULDER] : kps[KEYPOINT.LEFT_SHOULDER];
  if (
    otherShoulder &&
    shoulderScore >= FORM.MIN_CONFIDENCE &&
    (otherShoulder.score ?? 0) >= FORM.MIN_CONFIDENCE
  ) {
    const shoulderWidth = Math.abs(shoulder.x - otherShoulder.x);
    if (bodyLength > 0 && shoulderWidth > bodyLength * 0.25) {
      return {
        ...EMPTY_EVAL,
        reason: "body_not_side_on",
        side,
        bodyTiltDeg,
      };
    }
  }

  const otherHip = side === "left" ? kps[KEYPOINT.RIGHT_HIP] : kps[KEYPOINT.LEFT_HIP];
  if (
    otherHip &&
    hipScore >= FORM.MIN_CONFIDENCE &&
    (otherHip.score ?? 0) >= FORM.MIN_CONFIDENCE
  ) {
    const hipWidth = Math.abs(hip.x - otherHip.x);
    if (bodyLength > 0 && hipWidth > bodyLength * 0.25) {
      return {
        ...EMPTY_EVAL,
        reason: "body_not_side_on",
        side,
        bodyTiltDeg,
      };
    }
  }

  if (tiltRatio > FORM.HORIZONTAL_TILT_MAX) {
    return {
      reason: "body_not_horizontal",
      formValid: false,
      side,
      hipAngle: null,
      kneeAngle: null,
      bodyTiltDeg,
      elevationRatio: null,
      armBodyAngle: null,
      elbowAlignment: null,
      frameQuality: null,
      shoulderScore,
      elbowScore,
      wristScore,
      hipScore,
      kneeScore,
      ankleScore,
    };
  }

  const elbowDrop =
    elbow && elbowScore >= FORM.MIN_CONFIDENCE ? elbow.y - shoulder.y : -Infinity;
  const wristDrop =
    wrist && wristScore >= FORM.MIN_CONFIDENCE ? wrist.y - shoulder.y : -Infinity;
  const supportDrop = Math.max(elbowDrop, wristDrop);
  const elevationRatio =
    bodyLength > 0 && Number.isFinite(supportDrop)
      ? supportDrop / bodyLength
      : null;

  let armBodyAngle: number | null = null;
  const armPoint =
    wrist && wristScore >= FORM.MIN_CONFIDENCE
      ? wrist
      : elbow && elbowScore >= FORM.MIN_CONFIDENCE
        ? elbow
        : null;
  if (armPoint !== null && bodyLength > 0) {
    const ax = armPoint.x - shoulder.x;
    const ay = armPoint.y - shoulder.y;
    const armMag = Math.hypot(ax, ay);
    if (armMag > 0) {
      const cosAB = (ax * dx + ay * dy) / (armMag * bodyLength);
      armBodyAngle =
        (Math.acos(Math.max(-1, Math.min(1, cosAB))) * 180) / Math.PI;
    }
  }

  if (elevationRatio === null || armPoint === null) {
    return {
      reason: "body_not_visible",
      formValid: false,
      side,
      hipAngle: null,
      kneeAngle: null,
      bodyTiltDeg,
      elevationRatio,
      armBodyAngle,
      elbowAlignment: null,
      frameQuality: null,
      shoulderScore,
      elbowScore,
      wristScore,
      hipScore,
      kneeScore,
      ankleScore,
    };
  }

  if (elevationRatio < FORM.MIN_ELEVATION_RATIO) {
    return {
      reason: "body_not_elevated",
      formValid: false,
      side,
      hipAngle: null,
      kneeAngle: null,
      bodyTiltDeg,
      elevationRatio,
      armBodyAngle,
      elbowAlignment: null,
      frameQuality: null,
      shoulderScore,
      elbowScore,
      wristScore,
      hipScore,
      kneeScore,
      ankleScore,
    };
  }

  if (
    armBodyAngle === null ||
    armBodyAngle < FORM.ARM_BODY_ANGLE_MIN ||
    armBodyAngle > FORM.ARM_BODY_ANGLE_MAX
  ) {
    return {
      reason: "body_not_elevated",
      formValid: false,
      side,
      hipAngle: null,
      kneeAngle: null,
      bodyTiltDeg,
      elevationRatio,
      armBodyAngle,
      elbowAlignment: null,
      frameQuality: null,
      shoulderScore,
      elbowScore,
      wristScore,
      hipScore,
      kneeScore,
      ankleScore,
    };
  }

  const hipAngle = getAngle(shoulder, hip, effectiveAnkle);

  const kneeAngle =
    knee && kneeScore >= FORM.MIN_CONFIDENCE && effectiveAnkle !== knee
      ? getAngle(hip, knee, effectiveAnkle)
      : null;

  const elbowAlignment =
    elbow && elbowScore >= FORM.MIN_CONFIDENCE && bodyLength > 0
      ? 1 -
        Math.max(
          0,
          Math.min(
            1,
            Math.abs(elbow.x - shoulder.x) /
              (bodyLength * FORM.ARM_X_TOLERANCE_RATIO),
          ),
        )
      : null;

  // Base scoring components
  const hipQuality =
    1 -
    Math.max(
      0,
      Math.min(1, Math.abs(hipAngle - 180) / FORM.HIP_TOLERANCE_DEG),
    );
  const kneeQuality =
    kneeAngle !== null
      ? 1 -
        Math.max(
          0,
          Math.min(1, Math.abs(kneeAngle - 180) / FORM.KNEE_TOLERANCE_DEG),
        )
      : 0.8;
  const armQuality = elbowAlignment !== null ? elbowAlignment : 0.8;
  const tiltQuality =
    1 - Math.max(0, Math.min(1, bodyTiltDeg / FORM.TILT_FULL_LOSS_DEG));

  const baseFrameQuality =
    FORM.QUALITY_WEIGHTS.hip * hipQuality +
    FORM.QUALITY_WEIGHTS.knee * kneeQuality +
    FORM.QUALITY_WEIGHTS.arm * armQuality +
    FORM.QUALITY_WEIGHTS.tilt * tiltQuality;

  // Confidence weighting multiplier
  const activeScores = [
    shoulderScore,
    hipScore,
    ankleScore,
    kneeScore > 0 ? kneeScore : 1.0,
    elbowScore > 0 ? elbowScore : 1.0,
  ];
  const avgConfidence = activeScores.reduce((s, x) => s + x, 0) / activeScores.length;

  const frameQuality = baseFrameQuality * avgConfidence;
  const valid = frameQuality >= FORM.MIN_FRAME_QUALITY_FOR_VALID;

  return {
    reason: valid ? "ok" : "hip_angle_out_of_range",
    formValid: valid,
    side,
    hipAngle,
    kneeAngle,
    bodyTiltDeg,
    elevationRatio,
    armBodyAngle,
    elbowAlignment,
    frameQuality,
    shoulderScore,
    elbowScore,
    wristScore,
    hipScore,
    kneeScore,
    ankleScore,
  };
}

function handlePose(
  state: PlankState,
  kps: Keypoint[],
  dtMs: number,
): PlankState {
  if (
    state.kind === "IDLE" ||
    state.kind === "COMPLETED" ||
    state.kind === "DISQUALIFIED"
  ) {
    return state;
  }

  const dt = dtMs / 1000;
  const ev = evaluatePose(kps);

  if (state.kind === "READY") {
    if (ev.formValid) {
      const nextHold = state.readyHoldSeconds + dt;
      if (nextHold >= FORM.READY_HOLD_SECONDS) {
        return {
          ...state,
          kind: "IN_PLANK",
          recentValidities: [true], // Seed with first valid frame
          totalSeconds: 0,
          validSeconds: 0,
          violationSeconds: 0,
          readyHoldSeconds: 0,
          lastHipAngle: ev.hipAngle,
          lastSide: ev.side,
          lastReason: ev.reason,
        };
      }
      return {
        ...state,
        readyHoldSeconds: nextHold,
        lastHipAngle: ev.hipAngle,
        lastSide: ev.side,
        lastReason: ev.reason,
      };
    }
    return {
      ...state,
      readyHoldSeconds: 0,
      lastHipAngle: ev.hipAngle,
      lastSide: ev.side,
      lastReason: ev.reason,
    };
  }

  // Record rolling window history of evaluated pose frames (max 15)
  const nextRecent = [...(state.recentValidities ?? []), ev.formValid].slice(-15);
  const validCount = nextRecent.filter(v => v).length;

  // Consensus rules:
  // - If history has at least 5 frames: valid if validCount >= 11 (out of 15), else invalid.
  // - Otherwise fall back directly to current frame validity.
  const consensusValid = nextRecent.length >= 5 ? validCount >= 11 : ev.formValid;

  if (state.kind === "IN_PLANK") {
    if (consensusValid) {
      const q = ev.frameQuality ?? 0;
      const h = ev.hipAngle ?? 0;
      
      const hipQuality = ev.hipAngle !== null ? (1 - Math.max(0, Math.min(1, Math.abs(ev.hipAngle - 180) / FORM.HIP_TOLERANCE_DEG))) : 0.8;
      const kneeQuality = ev.kneeAngle !== null ? (1 - Math.max(0, Math.min(1, Math.abs(ev.kneeAngle - 180) / FORM.KNEE_TOLERANCE_DEG))) : 0.8;
      const armQuality = ev.elbowAlignment !== null ? ev.elbowAlignment : 0.8;
      const tiltQuality = ev.bodyTiltDeg !== null ? (1 - Math.max(0, Math.min(1, ev.bodyTiltDeg / FORM.TILT_FULL_LOSS_DEG))) : 0.8;
      const activeScores = [
        ev.shoulderScore,
        ev.hipScore,
        ev.ankleScore,
        ev.kneeScore > 0 ? ev.kneeScore : 1.0,
        ev.elbowScore > 0 ? ev.elbowScore : 1.0,
      ];
      const avgConfidence = activeScores.reduce((s, x) => s + x, 0) / activeScores.length;

      return {
        ...state,
        recentValidities: nextRecent,
        totalSeconds: state.totalSeconds + dt,
        validSeconds: state.validSeconds + dt,
        violationSeconds: 0,
        qualitySum: state.qualitySum + q,
        qualityFrames: state.qualityFrames + 1,
        hipAngleSum: state.hipAngleSum + h,
        hipAngleSumSq: state.hipAngleSumSq + h * h,
        // Granular accumulators
        hipQualitySum: (state.hipQualitySum ?? 0) + hipQuality,
        kneeQualitySum: (state.kneeQualitySum ?? 0) + kneeQuality,
        armQualitySum: (state.armQualitySum ?? 0) + armQuality,
        tiltQualitySum: (state.tiltQualitySum ?? 0) + tiltQuality,
        confidenceSum: (state.confidenceSum ?? 0) + avgConfidence,
        lastHipAngle: ev.hipAngle,
        lastSide: ev.side,
        lastReason: ev.reason,
      };
    }
    return {
      ...state,
      kind: "WARNING",
      recentValidities: nextRecent,
      totalSeconds: state.totalSeconds + dt,
      violationSeconds: dt,
      lastHipAngle: ev.hipAngle,
      lastSide: ev.side,
      lastReason: ev.reason,
    };
  }

  if (state.kind === "WARNING") {
    const nextViolation = state.violationSeconds + dt;
    if (
      nextViolation >= FORM.DQ_HOLD_SECONDS &&
      state.validSeconds >= FORM.MIN_VALID_SECONDS_FOR_DQ
    ) {
      return {
        ...state,
        kind: "DISQUALIFIED",
        recentValidities: nextRecent,
        totalSeconds: state.totalSeconds + dt,
        violationSeconds: nextViolation,
        lastHipAngle: ev.hipAngle,
        lastSide: ev.side,
        lastReason: ev.reason,
      };
    }
    if (consensusValid) {
      const q = ev.frameQuality ?? 0;
      const h = ev.hipAngle ?? 0;

      const hipQuality = ev.hipAngle !== null ? (1 - Math.max(0, Math.min(1, Math.abs(ev.hipAngle - 180) / FORM.HIP_TOLERANCE_DEG))) : 0.8;
      const kneeQuality = ev.kneeAngle !== null ? (1 - Math.max(0, Math.min(1, Math.abs(ev.kneeAngle - 180) / FORM.KNEE_TOLERANCE_DEG))) : 0.8;
      const armQuality = ev.elbowAlignment !== null ? ev.elbowAlignment : 0.8;
      const tiltQuality = ev.bodyTiltDeg !== null ? (1 - Math.max(0, Math.min(1, ev.bodyTiltDeg / FORM.TILT_FULL_LOSS_DEG))) : 0.8;
      const activeScores = [
        ev.shoulderScore,
        ev.hipScore,
        ev.ankleScore,
        ev.kneeScore > 0 ? ev.kneeScore : 1.0,
        ev.elbowScore > 0 ? ev.elbowScore : 1.0,
      ];
      const avgConfidence = activeScores.reduce((s, x) => s + x, 0) / activeScores.length;

      return {
        ...state,
        kind: "IN_PLANK",
        recentValidities: nextRecent,
        totalSeconds: state.totalSeconds + dt,
        validSeconds: state.validSeconds + dt,
        violationSeconds: 0,
        qualitySum: state.qualitySum + q,
        qualityFrames: state.qualityFrames + 1,
        hipAngleSum: state.hipAngleSum + h,
        hipAngleSumSq: state.hipAngleSumSq + h * h,
        // Granular accumulators
        hipQualitySum: (state.hipQualitySum ?? 0) + hipQuality,
        kneeQualitySum: (state.kneeQualitySum ?? 0) + kneeQuality,
        armQualitySum: (state.armQualitySum ?? 0) + armQuality,
        tiltQualitySum: (state.tiltQualitySum ?? 0) + tiltQuality,
        confidenceSum: (state.confidenceSum ?? 0) + avgConfidence,
        breaksCount: state.breaksCount + 1,
        lastHipAngle: ev.hipAngle,
        lastSide: ev.side,
        lastReason: ev.reason,
      };
    }
    return {
      ...state,
      recentValidities: nextRecent,
      totalSeconds: state.totalSeconds + dt,
      violationSeconds: nextViolation,
      lastHipAngle: ev.hipAngle,
      lastSide: ev.side,
      lastReason: ev.reason,
    };
  }

  return state;
}
