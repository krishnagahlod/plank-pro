import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import LeaderboardTable, {
  type LeaderboardRow,
} from "@/components/LeaderboardTable";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "Top 100 plank-endurance athletes by combined score. Only each athlete's best attempt counts.",
};

export default async function LeaderboardPage() {
  const supabase = createClient();

  const [{ data: rows }, { data: userResp }] = await Promise.all([
    supabase
      .from("leaderboard")
      .select(
        "user_id, full_name, city, valid_seconds, form_score, combined_score, created_at, is_shortlisted",
      )
      .order("combined_score", { ascending: false })
      .limit(100),
    supabase.auth.getUser(),
  ]);

  const safeRows: LeaderboardRow[] = (rows ?? []).map((r) => ({
    user_id: r.user_id,
    full_name: r.full_name,
    city: r.city,
    valid_seconds: Number(r.valid_seconds),
    form_score: Number(r.form_score),
    combined_score: Number(r.combined_score),
    created_at: r.created_at,
    is_shortlisted: r.is_shortlisted,
  }));

  const viewerId = userResp.user?.id ?? null;
  const viewerRow = viewerId
    ? safeRows.find((r) => r.user_id === viewerId)
    : null;
  const viewerRank = viewerRow
    ? safeRows.findIndex((r) => r.user_id === viewerId) + 1
    : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="rounded text-xs uppercase tracking-widest text-zinc-500 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          ← Plank-Pro
        </Link>
        {viewerId ? (
          <Link
            href="/record"
            className="inline-flex h-9 items-center rounded-full bg-sky-500 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-sky-400"
          >
            Record an attempt
          </Link>
        ) : (
          <Link
            href="/register"
            className="inline-flex h-9 items-center rounded-full bg-sky-500 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-sky-400"
          >
            Register to join
          </Link>
        )}
      </header>

      <section className="mt-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Leaderboard</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Top 100 athletes by combined score. Only each athlete&apos;s best
          attempt counts.
        </p>
      </section>

      {viewerRow && viewerRank !== null && (
        <section className="mt-6 flex flex-col items-start justify-between gap-2 rounded-2xl bg-sky-500/10 p-4 ring-1 ring-sky-500/30 sm:flex-row sm:items-center">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-sky-300">
              Your best
            </div>
            <div className="mt-0.5 text-sm text-sky-50">
              Rank{" "}
              <span className="font-bold tabular-nums">#{viewerRank}</span>
              {" · "}
              {viewerRow.combined_score.toFixed(1)} combined ·{" "}
              {viewerRow.valid_seconds.toFixed(1)}s valid ·{" "}
              {viewerRow.form_score.toFixed(0)}% form
            </div>
          </div>
          <Link
            href="/record"
            className="inline-flex h-9 items-center rounded-full bg-sky-500 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-sky-400"
          >
            Beat it
          </Link>
        </section>
      )}

      <section className="mt-6">
        {safeRows.length === 0 ? (
          <EmptyState />
        ) : (
          <LeaderboardTable rows={safeRows} viewerId={viewerId} />
        )}
      </section>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
      <h2 className="text-lg font-semibold text-zinc-100">
        No attempts yet
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Be the first athlete on the board.
      </p>
      <Link
        href="/register"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400"
      >
        Register & record
      </Link>
    </div>
  );
}
