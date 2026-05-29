"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import type { PendingAttempt } from "@/app/record/RecordingClient";
import { saveAttemptAction } from "@/app/record/actions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function ResultClient() {
  const router = useRouter();
  const [pending, setPending] = useState<PendingAttempt | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const hasRunRef = useRef(false);

  // Anti-Cheat & Risk telemetry returned from server
  const [attemptType, setAttemptType] = useState<"practice" | "official">("practice");
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [riskScore, setRiskScore] = useState<number | null>(null);
  const [riskReasons, setRiskReasons] = useState<string[]>([]);

  useEffect(() => {
    const raw =
      typeof window !== "undefined"
        ? sessionStorage.getItem("pendingAttempt")
        : null;
    if (!raw) {
      router.replace("/record");
      return;
    }
    try {
      const parsed = JSON.parse(raw) as PendingAttempt;
      setPending(parsed);
      setAttemptType(parsed.attempt_type || "practice");
    } catch {
      sessionStorage.removeItem("pendingAttempt");
      router.replace("/record");
    }
  }, [router]);

  const save = useCallback(async (attempt: PendingAttempt) => {
    setStatus("saving");
    setError(null);
    
    try {
      // Secure Server-Action Processing Layer
      const res = await saveAttemptAction({
        attempt_type: attempt.attempt_type,
        event_id: attempt.event_id,
        session_id: attempt.session_id,
        total_seconds: attempt.totalSeconds,
        valid_seconds: attempt.validSeconds,
        form_score: attempt.formScore,
        stability_score: attempt.stabilityScore,
        breaks_count: attempt.breaksCount,
        combined_score: attempt.combinedScore,
        scoring_version: attempt.scoring_version || "1.2.0",
        model_version: attempt.model_version || "movenet_lightning_v1",
        metrics: attempt.metrics || null,
        snapshots: attempt.snapshots ?? [],
        device_metadata: attempt.device_metadata,
      });

      setVerificationStatus(res.verificationStatus);
      setRiskScore(res.riskScore);
      setRiskReasons(res.riskReasons);

      sessionStorage.removeItem("pendingAttempt");
      setStatus("saved");
    } catch (insertErr) {
      console.error("[ResultClient] saveAttemptAction failed:", insertErr);
      const errMsg = insertErr instanceof Error ? insertErr.message : "unknown save error";
      setStatus("error");
      setError(errMsg);
    }
  }, []);

  useEffect(() => {
    if (!pending || hasRunRef.current) return;
    hasRunRef.current = true;
    void save(pending);
  }, [pending, save]);

  if (!pending) {
    return (
      <main className="mx-auto max-w-md px-5 py-10 text-sm text-zinc-400">
        Loading…
      </main>
    );
  }

  const isDQ = pending.kind === "DISQUALIFIED";

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-10 pb-20">
      <Link
        href="/"
        className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300 focus:outline-none"
      >
        ← Plank-Pro
      </Link>

      <span
        className={`mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-widest ${
          isDQ
            ? "bg-rose-500/15 text-rose-300"
            : "bg-emerald-500/15 text-emerald-300"
        }`}
      >
        {isDQ ? "Disqualified" : "Attempt complete"}
      </span>

      <h1 className="mt-3 text-4xl font-bold">
        Score:{" "}
        <span className="text-sky-400">{pending.combinedScore}</span>
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        Combined score rewards duration and form. Higher is better.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <ResultStat
          label="Combined"
          value={pending.combinedScore.toFixed(1)}
          accent
        />
        <ResultStat
          label="Valid s"
          value={pending.validSeconds.toFixed(1)}
        />
      </div>
      
      <div className="mt-3 grid grid-cols-3 gap-3">
        <ResultStat
          label="Form %"
          value={pending.formScore.toFixed(0)}
          suffix="%"
        />
        <ResultStat
          label="Stability"
          value={pending.stabilityScore.toFixed(0)}
          suffix="%"
        />
        <ResultStat
          label="Breaks"
          value={String(pending.breaksCount)}
        />
      </div>
      
      <p className="mt-3 text-xs text-zinc-500">
        Combined = duration × √form quality × stability bonus − pause penalty.
      </p>

      {/* Security Verification & Integrity Status Card */}
      {status === "saved" && attemptType === "official" && (
        <div className={`mt-6 rounded-2xl border p-5 backdrop-blur-sm ${
          verificationStatus === "verified"
            ? "border-emerald-500/20 bg-emerald-500/[0.02]"
            : "border-amber-500/20 bg-amber-500/[0.02]"
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Competitive Integrity
          </span>
          <h2 className={`mt-1 text-lg font-bold ${
            verificationStatus === "verified" ? "text-emerald-300" : "text-amber-300"
          }`}>
            {verificationStatus === "verified" ? "✓ Telemetry Verified" : "⚠ Attempt Flagged"}
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
            {verificationStatus === "verified"
              ? "All active browser anti-cheat signals verified. Your attempt has been registered on the leaderboard."
              : "This attempt has been flagged for manual review due to focus blur or tab hidden telemetry. Ranks will be finalized post-review."}
          </p>

          <div className="mt-4 flex flex-col gap-2 rounded-xl bg-zinc-950/40 p-3 ring-1 ring-zinc-800/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500">Anti-Cheat Risk Score:</span>
              <span className={`font-bold ${riskScore && riskScore >= 50 ? "text-amber-400" : "text-emerald-400"}`}>
                {riskScore}/100
              </span>
            </div>
            {riskReasons.length > 0 && (
              <div className="mt-2 border-t border-zinc-800/60 pt-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">Flagged Reasons:</span>
                <ul className="mt-1.5 list-disc list-inside text-[11px] text-amber-300/80 gap-1 flex flex-col">
                  {riskReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {status === "saved" && attemptType === "practice" && (
        <div className="mt-6 rounded-2xl border border-zinc-850 bg-zinc-900/10 p-5 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            Practice Run
          </span>
          <h2 className="mt-1 text-lg font-bold text-zinc-300">
            Not Logged on Leaderboard
          </h2>
          <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed">
            Practice attempts are privately analyzed and not committed to public competition leaderboards. Tap Try Again below to start an official tryout.
          </p>
        </div>
      )}

      {/* AI Form Analysis Coaching Panel */}
      {pending.metrics && (
        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/20 p-5 backdrop-blur-sm">
          <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
            AI Form Analysis
          </span>
          <h2 className="mt-1 text-lg font-bold text-zinc-100">Coaching Telemetry</h2>
          <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
            Detailed breakdown of your attempt. Aim for 80%+ across all metrics to maximize stability bonuses and form scores.
          </p>

          <div className="mt-4 flex flex-col gap-3">
            <MetricBar
              label="Hips Extension"
              value={pending.metrics.avgHipQuality * 100}
              feedback={pending.metrics.avgHipQuality >= 0.8 ? "Excellent, hips fully straight" : "Watch out, hips sagging or piking"}
            />
            <MetricBar
              label="Knee Straightness"
              value={pending.metrics.avgKneeQuality * 100}
              feedback={pending.metrics.avgKneeQuality >= 0.8 ? "Great, knees locked straight" : "Keep knees straight throughout the plank"}
            />
            <MetricBar
              label="Elbow Placement"
              value={pending.metrics.avgArmQuality * 100}
              feedback={pending.metrics.avgArmQuality >= 0.8 ? "Ideal perpendicular support" : "Elbows should sit directly under shoulders"}
            />
            <MetricBar
              label="Body Horizontality"
              value={pending.metrics.avgTiltQuality * 100}
              feedback={pending.metrics.avgTiltQuality >= 0.8 ? "Good flat body alignment" : "Ensure body lies parallel to floor"}
            />
            <MetricBar
              label="Keypoint Visibility"
              value={pending.metrics.avgConfidence * 100}
              feedback={pending.metrics.avgConfidence >= 0.8 ? "Excellent lighting & framing" : "Improve light exposure or stand closer to lens"}
            />
          </div>
          
          <div className="mt-4 flex justify-between text-[10px] text-zinc-500 border-t border-zinc-800/60 pt-3">
            <span>Formula v{pending.scoring_version || "1.2.0"}</span>
            <span>Model: {pending.model_version || "movenet_lightning_v1"}</span>
          </div>
        </div>
      )}

      <SaveBanner
        status={status}
        error={error}
        onRetry={() => pending && save(pending)}
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/leaderboard"
          className="inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400"
        >
          View leaderboard
        </Link>
        <Link
          href="/record"
          className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}

function MetricBar({
  label,
  value,
  feedback,
}: {
  label: string;
  value: number;
  feedback: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-zinc-900/60 p-3 ring-1 ring-zinc-800/40">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-zinc-300">{label}</span>
        <span className="font-bold text-sky-400">{value.toFixed(0)}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden mt-1">
        <div 
          className="h-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-300"
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      <span className="text-[10px] text-zinc-500 mt-0.5">{feedback}</span>
    </div>
  );
}

function SaveBanner({
  status,
  error,
  onRetry,
}: {
  status: SaveStatus;
  error: string | null;
  onRetry: () => void;
}) {
  if (status === "idle") return null;
  if (status === "saving") {
    return (
      <p className="mt-4 text-xs text-zinc-500">Saving to leaderboard…</p>
    );
  }
  if (status === "saved") {
    return (
      <p className="mt-4 text-xs text-emerald-400">Saved to leaderboard.</p>
    );
  }
  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl bg-rose-500/10 px-4 py-3 ring-1 ring-rose-500/30">
      <span className="text-sm text-rose-300">
        Save failed: {error ?? "unknown error"}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="self-start rounded-full bg-rose-500 px-4 py-1 text-xs font-semibold text-zinc-950 hover:bg-rose-400"
      >
        Retry
      </button>
    </div>
  );
}

function ResultStat({
  label,
  value,
  suffix,
  accent,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 p-4 ring-1 ring-zinc-800">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold tabular-nums ${accent ? "text-sky-300" : "text-zinc-100"}`}
      >
        {value}
        {suffix && (
          <span className="ml-0.5 text-base font-semibold text-zinc-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}
