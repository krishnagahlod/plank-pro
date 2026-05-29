"use client";

import { useState, useMemo, useTransition } from "react";
import { reviewAttemptAction } from "@/app/admin/actions";

export type ReviewAttemptRow = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  city: string;
  event_title: string;
  event_id: string | null;
  total_seconds: number;
  valid_seconds: number;
  form_score: number;
  stability_score: number;
  breaks_count: number;
  combined_score: number;
  verification_status: "pending" | "verified" | "flagged" | "rejected";
  risk_score: number;
  risk_reasons: string[];
  device_metadata: {
    browser?: string;
    os?: string;
    resolution?: string;
    fpsAvg?: number;
    fpsMin?: number;
    tabVisibilityChanges?: number;
    pageFocusLost?: number;
  };
  snapshots: { timestamp: number; image: string; type: string }[];
  review_notes: string;
  reviewed_at: string | null;
  created_at: string;
};

type StatusFilter = "all" | "pending_audit" | "verified" | "rejected";

type Props = {
  rows: ReviewAttemptRow[];
};

export default function AdminReviewClient({ rows }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_audit");
  const [selectedAttempt, setSelectedAttempt] = useState<ReviewAttemptRow | null>(null);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter === "pending_audit") {
        return r.verification_status === "pending" || r.verification_status === "flagged";
      }
      if (statusFilter === "verified") return r.verification_status === "verified";
      if (statusFilter === "rejected") return r.verification_status === "rejected";
      return true;
    });
  }, [rows, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters Bar */}
      <div className="flex items-center gap-2">
        <FilterButton
          active={statusFilter === "pending_audit"}
          onClick={() => setStatusFilter("pending_audit")}
        >
          Needs Audit ({rows.filter((r) => r.verification_status === "pending" || r.verification_status === "flagged").length})
        </FilterButton>
        <FilterButton
          active={statusFilter === "verified"}
          onClick={() => setStatusFilter("verified")}
        >
          Verified ({rows.filter((r) => r.verification_status === "verified").length})
        </FilterButton>
        <FilterButton
          active={statusFilter === "rejected"}
          onClick={() => setStatusFilter("rejected")}
        >
          Rejected ({rows.filter((r) => r.verification_status === "rejected").length})
        </FilterButton>
        <FilterButton
          active={statusFilter === "all"}
          onClick={() => setStatusFilter("all")}
        >
          All Attempts ({rows.length})
        </FilterButton>
      </div>

      {/* Main attempts table */}
      <div className="overflow-hidden rounded-2xl ring-1 ring-zinc-800 bg-zinc-900/20 backdrop-blur-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/60 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <th className="px-4 py-3">Athlete</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3 text-right">Duration</th>
              <th className="px-4 py-3 text-right">Form Score</th>
              <th className="px-4 py-3 text-right">Risk</th>
              <th className="px-4 py-3 text-right">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-zinc-900 hover:bg-zinc-900/40 transition">
                <td className="px-4 py-3">
                  <div className="font-semibold text-zinc-100">{r.full_name}</div>
                  <div className="text-[11px] text-zinc-500">{r.city} · {r.email}</div>
                </td>
                <td className="px-4 py-3 text-zinc-300 font-medium">
                  {r.event_title}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-300">
                  {r.valid_seconds.toFixed(1)}s <span className="text-[11px] text-zinc-600">/ {r.total_seconds.toFixed(0)}s</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-zinc-200">
                  {r.form_score.toFixed(0)}%
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                    r.risk_score >= 50
                      ? "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/20"
                      : r.risk_score >= 20
                        ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20"
                        : "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20"
                  }`}>
                    {r.risk_score}/100
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    r.verification_status === "verified"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : r.verification_status === "rejected"
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : r.verification_status === "flagged"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                          : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {r.verification_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedAttempt(r)}
                    className="inline-flex h-8 items-center rounded-full bg-sky-500 px-3 text-[11px] font-semibold text-zinc-950 transition hover:bg-sky-400 focus:outline-none"
                  >
                    Audit
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-sm text-zinc-500"
                >
                  No attempts match current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Audit Slide-out Modal */}
      {selectedAttempt && (
        <AuditPanel
          attempt={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
          onSuccess={() => {
            // Update local rows
            setSelectedAttempt(null);
          }}
        />
      )}
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center rounded-full px-4 text-xs font-semibold transition focus:outline-none ${
        active
          ? "bg-zinc-100 text-zinc-950"
          : "border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

/* Stunning Slide-out Audit Panel */
function AuditPanel({
  attempt,
  onClose,
  onSuccess,
}: {
  attempt: ReviewAttemptRow;
  onClose: () => void;
  onSuccess: (updated: ReviewAttemptRow) => void;
}) {
  const [notes, setNotes] = useState(attempt.review_notes || "");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleReview = (status: "verified" | "rejected") => {
    setError(null);
    startTransition(async () => {
      try {
        await reviewAttemptAction(attempt.id, status, notes);
        onSuccess({
          ...attempt,
          verification_status: status,
          review_notes: notes,
          reviewed_at: new Date().toISOString(),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save review");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />
      
      <div className="relative flex h-full w-full max-w-2xl flex-col bg-zinc-950 border-l border-zinc-800 p-6 shadow-2xl overflow-y-auto animate-slide-in-right">
        {/* Modal Header */}
        <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
              Audit Panel
            </span>
            <h2 className="text-xl font-extrabold text-zinc-50">{attempt.full_name}</h2>
            <p className="text-xs text-zinc-500 mt-0.5">{attempt.city} · {attempt.email}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-900 h-8 w-8 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-200"
          >
            ✕
          </button>
        </header>

        {/* Modal Content */}
        <div className="flex-1 py-6 flex flex-col gap-6">
          {/* Telemetry Overview Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-zinc-900/40 p-4 border border-zinc-800">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Performance Score</span>
              <span className="text-3xl font-extrabold text-sky-300 mt-1 block tabular-nums">
                {attempt.combined_score.toFixed(1)}
              </span>
              <div className="mt-2 text-xs text-zinc-400 flex flex-col gap-1">
                <div className="flex justify-between">
                  <span>Valid Duration:</span>
                  <span className="font-semibold text-zinc-200">{attempt.valid_seconds.toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Form Quality:</span>
                  <span className="font-semibold text-zinc-200">{attempt.form_score.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Stability score:</span>
                  <span className="font-semibold text-zinc-200">{attempt.stability_score.toFixed(0)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Breaks:</span>
                  <span className="font-semibold text-zinc-200">{attempt.breaks_count}</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-zinc-900/40 p-4 border border-zinc-800 flex flex-col justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-zinc-500 block">Risk Evaluation</span>
                <span className={`text-3xl font-extrabold mt-1 block tabular-nums ${
                  attempt.risk_score >= 50 ? "text-rose-400" : "text-emerald-400"
                }`}>
                  {attempt.risk_score}/100
                </span>
              </div>
              
              <div className="mt-3">
                <span className="text-[10px] uppercase tracking-wider font-semibold text-zinc-500 block">Risk Triggers:</span>
                {attempt.risk_reasons.length > 0 ? (
                  <ul className="list-disc list-inside mt-1 text-[11px] text-rose-300/80 flex flex-col gap-0.5">
                    {attempt.risk_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-[11px] text-emerald-400 mt-1 block">✓ All telemetry clean</span>
                )}
              </div>
            </div>
          </div>

          {/* Snapshot Evidence Slideshow */}
          <div className="rounded-xl bg-zinc-900/20 p-4 border border-zinc-850">
            <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400 block mb-3">
              Webcam Snapshot Evidence
            </span>
            <SnapshotCarousel snapshots={attempt.snapshots} attemptCreatedAt={attempt.created_at} />
          </div>

          {/* Technical Browser Telemetry */}
          <div className="rounded-xl bg-zinc-900/40 p-4 border border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block mb-3">
              Device Diagnostics
            </span>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
              <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-zinc-500">Operating System:</span>
                <span className="font-semibold text-zinc-200 capitalize">{attempt.device_metadata?.os || "unknown"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-zinc-500">Browser:</span>
                <span className="font-semibold text-zinc-200 capitalize">{attempt.device_metadata?.browser || "unknown"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-zinc-500">Display Resolution:</span>
                <span className="font-semibold text-zinc-200">{attempt.device_metadata?.resolution || "unknown"}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-zinc-500">Avg / Min Framerate:</span>
                <span className="font-semibold text-zinc-200 tabular-nums">
                  {attempt.device_metadata?.fpsAvg?.toFixed(1) || "--"} / {attempt.device_metadata?.fpsMin?.toFixed(1) || "--"} FPS
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-zinc-500">Tab Switch Hides:</span>
                <span className={`font-bold tabular-nums ${attempt.device_metadata?.tabVisibilityChanges ? "text-rose-400" : "text-zinc-300"}`}>
                  {attempt.device_metadata?.tabVisibilityChanges ?? 0}
                </span>
              </div>
              <div className="flex justify-between border-b border-zinc-900 pb-1.5">
                <span className="text-zinc-500">Window Focus Losses:</span>
                <span className={`font-bold tabular-nums ${attempt.device_metadata?.pageFocusLost ? "text-rose-400" : "text-zinc-300"}`}>
                  {attempt.device_metadata?.pageFocusLost ?? 0}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Actions */}
          <div className="mt-auto border-t border-zinc-800 pt-6">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 block mb-2">
                Reviewer Decision Notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Audit notes, reason for approval/rejection, posture feedback..."
                className="w-full h-24 rounded-xl border border-zinc-800 bg-zinc-900/60 p-3 text-sm text-zinc-200 placeholder:text-zinc-650 focus:border-sky-500 focus:outline-none"
              />
            </label>

            {error && (
              <div className="mt-3 rounded-lg bg-rose-500/10 p-3 text-xs text-rose-300 ring-1 ring-rose-500/20">
                {error}
              </div>
            )}

            <div className="mt-4 flex gap-3">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleReview("verified")}
                className="flex-1 inline-flex h-11 items-center justify-center rounded-full bg-emerald-500 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Approve Attempt"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleReview("rejected")}
                className="flex-1 inline-flex h-11 items-center justify-center rounded-full bg-rose-500 text-sm font-semibold text-zinc-950 hover:bg-rose-400 transition disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Reject Attempt"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Fully-custom Snapshot Slider Carousel */
function SnapshotCarousel({
  snapshots,
  attemptCreatedAt,
}: {
  snapshots: { timestamp: number; image: string; type: string }[];
  attemptCreatedAt: string;
}) {
  const [slideIdx, setSlideIdx] = useState(0);

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 bg-zinc-950/40 rounded-xl border border-zinc-850 border-dashed text-zinc-500 text-center gap-1">
        <span className="text-xl">📷</span>
        <span className="text-xs">No webcam evidence snapshots captured for this attempt.</span>
      </div>
    );
  }

  const active = snapshots[slideIdx];
  const relativeTime = active ? Math.round((active.timestamp - new Date(attemptCreatedAt).getTime()) / 1000) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black border border-zinc-800">
        {/* Snapshot Image */}
        {active && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={active.image}
            alt={`Snapshot evidence type ${active.type}`}
            className="h-full w-full object-cover"
          />
        )}

        {/* Badge Overlay */}
        {active && (
          <div className="absolute left-2.5 top-2.5 flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-950 shadow-md ${
              active.type === "warning"
                ? "bg-amber-400"
                : active.type === "start"
                  ? "bg-sky-400"
                  : active.type === "end"
                    ? "bg-rose-400"
                    : "bg-emerald-400"
            }`}>
              {active.type}
            </span>
            <span className="inline-flex items-center rounded-full bg-zinc-950/80 px-2 py-0.5 text-[9px] font-semibold text-zinc-300 shadow-md backdrop-blur">
              t = {relativeTime >= 0 ? relativeTime : 0}s
            </span>
          </div>
        )}

        {/* Carousel controls overlay */}
        {snapshots.length > 1 && (
          <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/85 via-black/35 to-transparent px-3 pb-3 pt-6">
            <button
              type="button"
              onClick={() => setSlideIdx((prev) => (prev > 0 ? prev - 1 : snapshots.length - 1))}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-zinc-950/70 border border-zinc-800/40 text-zinc-300 transition hover:bg-zinc-900/80"
            >
              ←
            </button>
            <span className="inline-flex items-center text-[10px] font-semibold tracking-wider text-zinc-400">
              {slideIdx + 1} / {snapshots.length}
            </span>
            <button
              type="button"
              onClick={() => setSlideIdx((prev) => (prev < snapshots.length - 1 ? prev + 1 : 0))}
              className="h-8 w-8 inline-flex items-center justify-center rounded-full bg-zinc-950/70 border border-zinc-800/40 text-zinc-300 transition hover:bg-zinc-900/80"
            >
              →
            </button>
          </div>
        )}
      </div>

      {/* Thumbnails list */}
      {snapshots.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {snapshots.map((snap, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlideIdx(i)}
              className={`relative h-11 w-20 shrink-0 overflow-hidden rounded-lg border transition ${
                slideIdx === i ? "border-sky-400 scale-[1.02]" : "border-zinc-800 opacity-60 hover:opacity-90"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={snap.image}
                alt="thumbnail"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
