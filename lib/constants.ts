// Thresholds calibrated against open-source plank trackers
// (MediaPipe Pose example apps + ai-fitness-trainer-style tutorials).
// Loosen these in tiny increments — too strict and real planks fail;
// too loose and seated/standing/lying positions read as valid.
export const FORM = {
  // Hip-angle window for a valid plank (degrees). 180° is perfectly straight.
  VALID_MIN: 155,
  VALID_MAX: 200,
  WARN_MIN: 145,
  // Continuous form-violation budget before auto-stop (seconds).
  // Form breaks under this length just pause the timer; nothing harsh.
  DQ_HOLD_SECONDS: 8,
  // Auto-stop only kicks in after the user has accumulated this much valid
  // plank time. Below this threshold a long break just keeps the timer paused
  // so beginners aren't punished while setting up.
  MIN_VALID_SECONDS_FOR_DQ: 10,
  // Per-keypoint MoveNet score floor (shoulder/hip/ankle on the chosen side).
  // MediaPipe's visibility floor is ~0.3 — anything below is treated as hallucinated.
  MIN_CONFIDENCE: 0.2,
  TARGET_FPS: 30,
  // Body axis tilt limit. shoulder→ankle vector must satisfy |dy| <= TILT * |dx|.
  // 1.0 → up to 45° tilt from horizontal. Rejects seated/standing
  // (where dy >> dx) but tolerates non-ideal camera angles.
  HORIZONTAL_TILT_MAX: 1.5,
  // Elbow / wrist must sit at least this fraction of the shoulder→ankle
  // distance BELOW the shoulder. Distinguishes a plank (body suspended
  // above the supporting arm) from lying flat (everything at floor level).
  // A forearm plank typically gives a ratio of 0.25–0.40.
  MIN_ELEVATION_RATIO: 0.1,
  // Angle (degrees) between the body axis (shoulder→ankle) and the supporting
  // arm (shoulder→wrist or shoulder→elbow). In a plank the arm goes roughly
  // perpendicular to the body (~90°). When lying flat with arms by the sides
  // the arm is parallel to the body (~0° or ~180°). This is the single most
  // reliable discriminator between the two postures in 2D pose.
  ARM_BODY_ANGLE_MIN: 45,
  ARM_BODY_ANGLE_MAX: 135,
  // Must hold a valid plank for this long before the timer starts.
  // Filters spurious single-frame matches without making the user wait.
  READY_HOLD_SECONDS: 0.5,
  // One Euro Filter parameters for keypoint smoothing. Tuned against
  // production fitness apps: heavy smoothing while still, lets through
  // intentional motion. Lower min cutoff → calmer at rest but more lag.
  // Higher beta → snappier response to fast moves.
  ONE_EURO_MIN_CUTOFF: 1.0,
  ONE_EURO_BETA: 0.5,

  // ── Phase 8 — Continuous quality scoring ──────────────────────────────
  // Each frame is graded 0–1 on how close it is to a perfect plank.
  // Components: hip straightness, knee straightness, elbow under shoulder,
  // body horizontality. Weights sum to 1.
  HIP_TOLERANCE_DEG: 25,
  KNEE_TOLERANCE_DEG: 30,
  ARM_X_TOLERANCE_RATIO: 0.18, // |elbow.x − shoulder.x| / bodyLength
  TILT_FULL_LOSS_DEG: 45,
  QUALITY_WEIGHTS: {
    hip: 0.45,
    knee: 0.25,
    arm: 0.2,
    tilt: 0.1,
  },
  // Frame must hit at least this quality (in addition to the existing
  // pass/fail gates) to count toward IN_PLANK time.
  MIN_FRAME_QUALITY_FOR_VALID: 0.35,
  // Hip-angle standard deviation at which stability score hits 0.
  STABILITY_FULL_LOSS_DEG: 15,
  // Each WARNING→IN_PLANK recovery costs this fraction of the final score,
  // capped at BREAK_PENALTY_CAP.
  BREAK_PENALTY_PER: 0.05,
  BREAK_PENALTY_CAP: 0.3,
} as const;

export const KEYPOINT = {
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
} as const;
