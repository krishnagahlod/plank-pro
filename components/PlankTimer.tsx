"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  initialState,
  reduce,
  type Keypoint,
  type PlankState,
} from "@/lib/pose/plankState";
import { computeScore, type AttemptScore } from "@/lib/pose/scoring";
import { describePlankState } from "@/components/plankStateDescribe";

type CompletionKind = "COMPLETED" | "DISQUALIFIED";

export function usePlankTimer(opts: {
  onComplete: (score: AttemptScore, kind: CompletionKind) => void;
}) {
  const [state, dispatch] = useReducer(reduce, initialState);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(opts.onComplete);

  useEffect(() => {
    onCompleteRef.current = opts.onComplete;
  });

  useEffect(() => {
    if (
      (state.kind === "COMPLETED" || state.kind === "DISQUALIFIED") &&
      !completedRef.current
    ) {
      completedRef.current = true;
      const score = computeScore({
        totalSeconds: state.totalSeconds,
        validSeconds: state.validSeconds,
        qualitySum: state.qualitySum,
        qualityFrames: state.qualityFrames,
        hipAngleSum: state.hipAngleSum,
        hipAngleSumSq: state.hipAngleSumSq,
        breaksCount: state.breaksCount,
      });
      onCompleteRef.current(score, state.kind);
    }
    if (state.kind === "IDLE" || state.kind === "READY") {
      completedRef.current = false;
    }
  }, [
    state.kind,
    state.totalSeconds,
    state.validSeconds,
    state.qualitySum,
    state.qualityFrames,
    state.hipAngleSum,
    state.hipAngleSumSq,
    state.breaksCount,
  ]);

  const start = useCallback(() => dispatch({ type: "START" }), []);
  const stop = useCallback(() => dispatch({ type: "STOP" }), []);
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const tick = useCallback(
    (keypoints: Keypoint[], dtMs: number) =>
      dispatch({ type: "POSE", keypoints, dtMs }),
    [],
  );

  return { state, start, stop, reset, tick };
}

/**
 * Combined status + timer card. Replaces the previous separate PlankTimer
 * stats grid and FormIndicator card — one card with the headline state, the
 * actionable message, and the timers all visible at once.
 */
export default function PlankTimer({ state }: { state: PlankState }) {
  const { tone, label, sub } = describePlankState(state);
  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl p-4 sm:p-5 ${tone.bg} ${tone.ring} transition-colors duration-300`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold leading-snug ${tone.text}`}>
            {label}
          </div>
          {sub && (
            <p className={`mt-0.5 text-xs leading-snug ${tone.subText}`}>
              {sub}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Valid" value={`${state.validSeconds.toFixed(1)}s`} accent />
        <Stat label="Total" value={`${state.totalSeconds.toFixed(1)}s`} />
        <Stat
          label="Quality"
          value={`${(state.qualityFrames > 0
            ? (state.qualitySum / state.qualityFrames) * 100
            : 0
          ).toFixed(0)}%`}
        />
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl bg-zinc-950/40 px-3 py-2 ring-1 ring-zinc-800/80">
      <div className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div
        className={`mt-0.5 text-2xl font-bold tabular-nums ${accent ? "text-sky-300" : "text-zinc-100"}`}
      >
        {value}
      </div>
    </div>
  );
}
