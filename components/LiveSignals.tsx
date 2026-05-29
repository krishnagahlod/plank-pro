"use client";

import { FORM } from "@/lib/constants";
import type { EvalResult } from "@/lib/pose/plankState";

type Props = { diag: EvalResult | null };

export default function LiveSignals({ diag }: Props) {
  const hasData = diag !== null && diag.side !== null;

  return (
    <section className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800 sm:p-5">
      <header className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          Live signals
        </h3>
        <span className="text-[11px] text-zinc-500">
          {hasData ? `${diag.side} side` : "no body detected"}
        </span>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <RangeMeter
          label="Form quality"
          value={
            diag?.frameQuality !== null && diag?.frameQuality !== undefined
              ? diag.frameQuality * 100
              : null
          }
          unit="%"
          scaleMin={0}
          scaleMax={100}
          targetMin={FORM.MIN_FRAME_QUALITY_FOR_VALID * 100}
          targetMax={100}
        />
        <RangeMeter
          label="Hip angle"
          value={diag?.hipAngle ?? null}
          unit="°"
          scaleMin={90}
          scaleMax={220}
          targetMin={180 - FORM.HIP_TOLERANCE_DEG}
          targetMax={180 + FORM.HIP_TOLERANCE_DEG}
          dimWhen={
            diag?.reason === "body_not_horizontal" ||
            diag?.reason === "body_not_elevated"
          }
        />
        <RangeMeter
          label="Knee angle"
          value={diag?.kneeAngle ?? null}
          unit="°"
          scaleMin={90}
          scaleMax={220}
          targetMin={180 - FORM.KNEE_TOLERANCE_DEG}
          targetMax={180 + FORM.KNEE_TOLERANCE_DEG}
        />
        <RangeMeter
          label="Elbow align"
          value={
            diag?.elbowAlignment !== null && diag?.elbowAlignment !== undefined
              ? diag.elbowAlignment * 100
              : null
          }
          unit="%"
          scaleMin={0}
          scaleMax={100}
          targetMin={60}
          targetMax={100}
        />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-1 sm:grid-cols-2">
        <VisibilityRow label="Shoulder" value={diag?.shoulderScore ?? 0} />
        <VisibilityRow label="Elbow" value={diag?.elbowScore ?? 0} />
        <VisibilityRow label="Hip" value={diag?.hipScore ?? 0} />
        <VisibilityRow label="Knee" value={diag?.kneeScore ?? 0} />
        <VisibilityRow label="Wrist" value={diag?.wristScore ?? 0} />
        <VisibilityRow label="Ankle" value={diag?.ankleScore ?? 0} />
      </div>
    </section>
  );
}

type RangeMeterProps = {
  label: string;
  value: number | null;
  unit: string;
  scaleMin: number;
  scaleMax: number;
  targetMin: number;
  targetMax: number;
  dimWhen?: boolean;
};

function RangeMeter({
  label,
  value,
  unit,
  scaleMin,
  scaleMax,
  targetMin,
  targetMax,
  dimWhen,
}: RangeMeterProps) {
  const inTarget = value !== null && value >= targetMin && value <= targetMax;
  const dim = dimWhen || value === null;
  const span = Math.max(scaleMax - scaleMin, 1);
  const targetLeft = Math.max(0, ((targetMin - scaleMin) / span) * 100);
  const targetWidth = Math.max(0, ((targetMax - targetMin) / span) * 100);
  const markerLeft =
    value !== null
      ? Math.min(100, Math.max(0, ((value - scaleMin) / span) * 100))
      : 0;

  return (
    <div
      className={`rounded-xl bg-zinc-950/40 p-2.5 ring-1 ring-zinc-800/80 transition-opacity duration-300 ${dim ? "opacity-60" : ""}`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          {label}
        </span>
        <span
          className={`text-[10px] font-semibold transition-colors duration-300 ${
            inTarget
              ? "text-emerald-400"
              : value === null
                ? "text-zinc-500"
                : "text-amber-400"
          }`}
        >
          {inTarget ? "ok" : value === null ? "—" : "off"}
        </span>
      </div>
      <div className="mt-0.5 text-xl font-bold tabular-nums text-zinc-100">
        {value !== null ? `${value.toFixed(0)}${unit}` : "—"}
      </div>
      <div className="relative mt-1.5 h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="absolute h-full bg-emerald-500/30"
          style={{ left: `${targetLeft}%`, width: `${targetWidth}%` }}
        />
        {value !== null && (
          <div
            className={`absolute top-1/2 h-3 w-0.5 -translate-y-1/2 transition-[left,background-color] duration-300 ease-out ${
              inTarget ? "bg-emerald-400" : "bg-amber-400"
            }`}
            style={{ left: `${markerLeft}%` }}
          />
        )}
      </div>
    </div>
  );
}

function VisibilityRow({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  const tone =
    value >= 0.5
      ? "bg-emerald-400"
      : value >= FORM.MIN_CONFIDENCE
        ? "bg-amber-400"
        : "bg-rose-400/70";
  return (
    <div className="flex items-center gap-2 text-[11px]">
      <span className="w-14 shrink-0 text-zinc-400">{label}</span>
      <div className="relative h-1 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`absolute inset-y-0 left-0 transition-[width,background-color] duration-300 ease-out ${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right tabular-nums text-zinc-200">
        {Math.round(pct)}%
      </span>
    </div>
  );
}
