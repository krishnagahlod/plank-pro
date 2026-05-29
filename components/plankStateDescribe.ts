import { FORM } from "@/lib/constants";
import type { PlankState, PoseReason } from "@/lib/pose/plankState";

export type Tone = {
  bg: string;
  ring: string;
  dot: string;
  text: string;
  subText: string;
};

export type StateDescription = {
  tone: Tone;
  label: string;
  sub: string | null;
};

export function describePlankState(state: PlankState): StateDescription {
  const angleStr =
    state.lastHipAngle !== null
      ? ` · hip ${state.lastHipAngle.toFixed(0)}°`
      : "";

  switch (state.kind) {
    case "IDLE":
      return { tone: paletteFor("zinc"), label: "Stand by", sub: null };

    case "READY": {
      if (state.lastReason === "ok") {
        const remaining = Math.max(
          FORM.READY_HOLD_SECONDS - state.readyHoldSeconds,
          0,
        );
        return {
          tone: paletteFor("emerald"),
          label: `Hold steady${angleStr}`,
          sub: `Timer starts in ${remaining.toFixed(1)}s.`,
        };
      }
      return {
        tone: paletteFor("sky"),
        label: readyPrompt(state.lastReason),
        sub: readySubPrompt(state.lastReason, state.lastHipAngle),
      };
    }

    case "IN_PLANK":
      return {
        tone: paletteFor("emerald"),
        label: `Form is solid${angleStr}`,
        sub: "Keep your body in a straight line.",
      };

    case "WARNING": {
      const canDQ = state.validSeconds >= FORM.MIN_VALID_SECONDS_FOR_DQ;
      const remaining = Math.max(
        FORM.DQ_HOLD_SECONDS - state.violationSeconds,
        0,
      );
      const dqImminent = canDQ && remaining <= 4;
      return {
        tone: paletteFor("amber"),
        label: warningPrompt(state.lastReason, state.lastHipAngle),
        sub: dqImminent
          ? `Auto-stopping in ${remaining.toFixed(1)}s if not corrected.`
          : "Timer paused — recover form to continue.",
      };
    }

    case "COMPLETED":
      return {
        tone: paletteFor("zinc"),
        label: "Attempt complete",
        sub: null,
      };

    case "DISQUALIFIED":
      return {
        tone: paletteFor("rose"),
        label: "Disqualified — form held too long",
        sub: "Try again after a quick reset.",
      };
  }
}

export function readyPrompt(reason: PoseReason | null): string {
  switch (reason) {
    case "body_not_visible":
    case null:
      return "Step into frame";
    case "body_not_horizontal":
      return "Get into plank position";
    case "body_not_elevated":
      return "Lift your body up";
    case "hip_angle_out_of_range":
      return "Straighten your back";
    case "body_not_side_on":
      return "Turn side-on to camera";
    case "ok":
      return "Hold steady";
  }
}

export function readySubPrompt(
  reason: PoseReason | null,
  hipAngle: number | null,
): string {
  switch (reason) {
    case "body_not_visible":
    case null:
      return "Shoulder, hip, and ankle must all be visible side-on to the camera.";
    case "body_not_horizontal":
      return "Your body should be roughly horizontal — go down into a plank.";
    case "body_not_elevated":
      return "Push up onto your forearms or hands — don't lie flat on the floor.";
    case "hip_angle_out_of_range":
      return hipAngle !== null
        ? `Hip is at ${hipAngle.toFixed(0)}° — aim for 170–190°.`
        : "Keep a straight line from shoulder to ankle.";
    case "body_not_side_on":
      return "Align your body side-on perpendicular to the lens (no front-facing).";
    case "ok":
      return "";
  }
}

export function warningPrompt(
  reason: PoseReason | null,
  hipAngle: number | null,
): string {
  switch (reason) {
    case "hip_angle_out_of_range":
      return hipAngle !== null
        ? `Fix form — hip ${hipAngle.toFixed(0)}°`
        : "Fix your form";
    case "body_not_horizontal":
      return "Get back into plank position";
    case "body_not_elevated":
      return "Lift your body — don't rest on the floor";
    case "body_not_visible":
    case null:
      return "I can't see you — adjust the camera";
    case "body_not_side_on":
      return "Turn side-on to the camera";
    case "ok":
      return "Fix your form";
  }
}

export function paletteFor(
  color: "zinc" | "sky" | "emerald" | "amber" | "rose",
): Tone {
  const map = {
    zinc: {
      bg: "bg-zinc-900/60",
      ring: "ring-1 ring-zinc-800",
      dot: "bg-zinc-500",
      text: "text-zinc-200",
      subText: "text-zinc-400",
    },
    sky: {
      bg: "bg-sky-500/10",
      ring: "ring-1 ring-sky-500/30",
      dot: "bg-sky-400",
      text: "text-sky-100",
      subText: "text-sky-300/80",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      ring: "ring-1 ring-emerald-500/30",
      dot: "bg-emerald-400",
      text: "text-emerald-100",
      subText: "text-emerald-300/80",
    },
    amber: {
      bg: "bg-amber-500/10",
      ring: "ring-1 ring-amber-500/40",
      dot: "bg-amber-400",
      text: "text-amber-100",
      subText: "text-amber-300/80",
    },
    rose: {
      bg: "bg-rose-500/10",
      ring: "ring-1 ring-rose-500/40",
      dot: "bg-rose-400",
      text: "text-rose-100",
      subText: "text-rose-300/80",
    },
  } as const;
  return map[color];
}
