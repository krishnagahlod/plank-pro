"use client";

import type { PlankState } from "@/lib/pose/plankState";
import { describePlankState } from "@/components/plankStateDescribe";

/**
 * Mobile-immersive timer overlay. Sits over the camera feed at ~60% vertical
 * so it doesn't cover the user's body. Shows Valid seconds in huge type, with
 * the state label + tip stacked above and a compact Total/Quality line below.
 */
export default function BigTimer({ state }: { state: PlankState }) {
  const { tone, label, sub } = describePlankState(state);
  const qualityPct =
    state.qualityFrames > 0
      ? (state.qualitySum / state.qualityFrames) * 100
      : 0;

  return (
    <section
      className={`mx-3 max-w-md rounded-2xl bg-zinc-950/75 px-4 py-3 backdrop-blur ${tone.ring} transition-colors duration-300`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
        <div className="min-w-0 flex-1">
          <div
            className={`truncate text-xs font-semibold leading-tight ${tone.text}`}
          >
            {label}
          </div>
          {sub && (
            <p
              className={`truncate text-[10px] leading-tight ${tone.subText}`}
            >
              {sub}
            </p>
          )}
        </div>
      </div>

      <div className="mt-1 flex items-baseline justify-between gap-3">
        <div
          className={`text-[64px] font-bold leading-none tabular-nums ${tone.text}`}
        >
          {state.validSeconds.toFixed(1)}
          <span className="ml-1 text-2xl font-semibold text-zinc-400">s</span>
        </div>
        <div className="text-right text-[10px] font-medium uppercase tracking-widest text-zinc-400">
          <div>Total {state.totalSeconds.toFixed(1)}s</div>
          <div>Quality {qualityPct.toFixed(0)}%</div>
        </div>
      </div>
    </section>
  );
}
