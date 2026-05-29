import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/admin/actions";
import AdminReviewClient, { type ReviewAttemptRow } from "./AdminReviewClient";

export const dynamic = "force-dynamic";

interface AttemptQueryResult {
  id: string;
  user_id: string;
  total_seconds: number;
  valid_seconds: number;
  form_score: number;
  stability_score: number;
  breaks_count: number;
  combined_score: number;
  verification_status: "pending" | "verified" | "flagged" | "rejected";
  risk_score: number;
  risk_reasons: string[];
  device_metadata: Record<string, unknown> | null;
  snapshots: unknown[] | null;
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  event_id: string | null;
  profiles: {
    full_name: string;
    city: string;
    email: string;
  } | null;
  events: {
    title: string;
  } | null;
}

export default async function AdminReviewsPage() {
  const admin = createAdminClient();
  
  // Query attempts where attempt_type is 'official', including profile information and event name
  const { data, error } = await admin
    .from("attempts")
    .select(`
      id,
      total_seconds,
      valid_seconds,
      form_score,
      stability_score,
      breaks_count,
      combined_score,
      verification_status,
      risk_score,
      risk_reasons,
      device_metadata,
      snapshots,
      review_notes,
      reviewed_at,
      created_at,
      event_id,
      user_id,
      profiles (
        full_name,
        city,
        email
      ),
      events (
        title
      )
    `)
    .eq("attempt_type", "official")
    .order("created_at", { ascending: false });

  const rows: ReviewAttemptRow[] = ((data as unknown as AttemptQueryResult[]) ?? []).map((a) => ({
    id: a.id,
    user_id: a.user_id,
    full_name: a.profiles?.full_name ?? "Unknown Athlete",
    email: a.profiles?.email ?? "",
    city: a.profiles?.city ?? "Unknown City",
    event_title: a.events?.title ?? "General Qualifications",
    event_id: a.event_id,
    total_seconds: Number(a.total_seconds),
    valid_seconds: Number(a.valid_seconds),
    form_score: Number(a.form_score),
    stability_score: Number(a.stability_score),
    breaks_count: Number(a.breaks_count),
    combined_score: Number(a.combined_score),
    verification_status: a.verification_status,
    risk_score: Number(a.risk_score || 0),
    risk_reasons: a.risk_reasons ?? [],
    device_metadata: (a.device_metadata as Record<string, unknown>) ?? {},
    snapshots: (a.snapshots as { timestamp: number; image: string; type: string }[]) ?? [],
    review_notes: a.review_notes ?? "",
    reviewed_at: a.reviewed_at,
    created_at: a.created_at,
  }));

  const pendingCount = rows.filter((r) => r.verification_status === "pending" || r.verification_status === "flagged").length;

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="rounded text-xs uppercase tracking-widest text-zinc-500 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          ← Plank-Pro
        </Link>
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex h-9 items-center rounded-full border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Log out
          </button>
        </form>
      </header>

      <nav className="mt-6 inline-flex rounded-full bg-zinc-900/60 p-1 ring-1 ring-zinc-800">
        <Link
          href="/admin"
          className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-100"
        >
          Shortlist
        </Link>
        <span className="inline-flex h-8 items-center rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-950">
          Review Queue
        </span>
        <Link
          href="/admin/events"
          className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-100"
        >
          Events
        </Link>
      </nav>

      <section className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Attempt Review Queue</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Audit competitive official attempts. Flipping through captured snapshots enables visual verification of attempt authenticity.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>
            <span className="font-bold tabular-nums text-zinc-100">
              {rows.length}
            </span>{" "}
            attempt{rows.length === 1 ? "" : "s"} total
          </span>
          <span>·</span>
          <span>
            <span className="font-bold tabular-nums text-amber-400">
              {pendingCount}
            </span>{" "}
            needs audit
          </span>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
          Could not load review queue: {error.message}
        </div>
      )}

      <section className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-400">
            No official attempts have been recorded yet.
          </div>
        ) : (
          <AdminReviewClient rows={rows} />
        )}
      </section>
    </main>
  );
}
