import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import AnimatedNumber from "@/components/AnimatedNumber";
import { logoutAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your Plank-Pro dashboard — best score, recent attempts and rank.",
};

type Attempt = {
  id: string;
  combined_score: number;
  valid_seconds: number;
  total_seconds: number;
  form_score: number;
  stability_score: number | null;
  breaks_count: number | null;
  created_at: string;
};

export default async function DashboardPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, city")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/register?next=/dashboard");

  // Run the rest in parallel — independent reads.
  const [bestRes, recentRes, countRes, boardRes] = await Promise.all([
    supabase
      .from("attempts")
      .select(
        "id, combined_score, valid_seconds, total_seconds, form_score, stability_score, breaks_count, created_at",
      )
      .eq("user_id", user.id)
      .eq("is_best", true)
      .maybeSingle(),
    supabase
      .from("attempts")
      .select(
        "id, combined_score, valid_seconds, total_seconds, form_score, stability_score, breaks_count, created_at",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("leaderboard")
      .select("user_id, combined_score")
      .order("combined_score", { ascending: false }),
  ]);

  const best = (bestRes.data as Attempt | null) ?? null;
  const recent = (recentRes.data as Attempt[] | null) ?? [];
  const attemptCount = countRes.count ?? 0;
  const board = boardRes.data ?? [];
  const totalAthletes = board.length;
  const rankIndex = board.findIndex((r) => r.user_id === user.id);
  const rank = rankIndex >= 0 ? rankIndex + 1 : null;

  const firstName = profile.full_name.split(" ")[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-900/80 bg-zinc-950/60 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="text-sm font-bold tracking-[0.2em] text-sky-400 outline-none transition hover:text-sky-300 focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded"
          >
            PLANK-PRO
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/leaderboard"
              className="hidden h-10 items-center rounded-full px-3 text-sm font-semibold text-zinc-300 transition hover:text-white sm:inline-flex"
            >
              Leaderboard
            </Link>
            <Link
              href="/events"
              className="hidden h-10 items-center rounded-full px-3 text-sm font-semibold text-zinc-300 transition hover:text-white sm:inline-flex"
            >
              Events
            </Link>
            <span className="hidden rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-xs text-zinc-300 md:inline">
              {profile.full_name}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="inline-flex h-10 items-center rounded-full border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                Log out
              </button>
            </form>
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <section className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div className="animate-fade-up">
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
              Welcome back, {firstName}.
            </h1>
            <p className="mt-2 text-sm text-zinc-400 sm:text-base">
              {attemptCount === 0
                ? "You haven't recorded an attempt yet — your first one will land you on the leaderboard."
                : `${attemptCount} attempt${attemptCount === 1 ? "" : "s"} on file. Try to beat your best.`}
            </p>
          </div>
          <Link
            href="/record"
            className="animate-fade-up delay-100 animate-glow-cta inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-sky-500 px-7 text-sm font-semibold text-zinc-950 shadow-lg shadow-sky-500/20 transition hover:scale-[1.02] hover:bg-sky-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Record new attempt
          </Link>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="animate-fade-up delay-200">
            <BestScoreCard best={best} />
          </div>
          <div className="animate-fade-up delay-300">
            <RankCard rank={rank} totalAthletes={totalAthletes} />
          </div>
          <div className="animate-fade-up delay-500">
            <AttemptsCountCard count={attemptCount} />
          </div>
        </section>

        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xl font-semibold">Recent attempts</h2>
            <Link
              href="/leaderboard"
              className="text-xs font-semibold uppercase tracking-widest text-sky-400 transition hover:text-sky-300"
            >
              View leaderboard →
            </Link>
          </div>
          {recent.length === 0 ? (
            <EmptyAttempts />
          ) : (
            <RecentAttemptsTable attempts={recent} />
          )}
        </section>
      </main>
    </div>
  );
}

function BestScoreCard({ best }: { best: Attempt | null }) {
  if (!best) {
    return (
      <Card title="Best score">
        <p className="text-sm text-zinc-400">No attempts yet.</p>
        <Link
          href="/record"
          className="mt-3 inline-flex text-xs font-semibold uppercase tracking-widest text-sky-400 transition hover:text-sky-300"
        >
          Record your first →
        </Link>
      </Card>
    );
  }

  const stability = best.stability_score;

  return (
    <Card title="Best score" accent>
      <div className="flex items-baseline gap-2">
        <AnimatedNumber
          value={best.combined_score}
          decimals={1}
          className="text-5xl font-bold text-sky-300"
        />
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          combined
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-400">
        <div className="flex justify-between">
          <dt>Valid</dt>
          <dd className="text-zinc-200">
            <AnimatedNumber
              value={best.valid_seconds}
              decimals={1}
              suffix="s"
            />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Form</dt>
          <dd className="text-zinc-200">
            <AnimatedNumber value={best.form_score} decimals={0} suffix="%" />
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Stability</dt>
          <dd className="text-zinc-200">
            {stability !== null ? (
              <AnimatedNumber value={stability} decimals={0} suffix="%" />
            ) : (
              <span className="tabular-nums">—</span>
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>Breaks</dt>
          <dd className="text-zinc-200">
            <AnimatedNumber value={best.breaks_count ?? 0} decimals={0} />
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function RankCard({
  rank,
  totalAthletes,
}: {
  rank: number | null;
  totalAthletes: number;
}) {
  return (
    <Card title="Leaderboard rank">
      {rank ? (
        <>
          <div className="flex items-baseline gap-2">
            <AnimatedNumber
              value={rank}
              decimals={0}
              prefix="#"
              className="text-5xl font-bold"
            />
            <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              of {totalAthletes}
            </span>
          </div>
          <Link
            href="/leaderboard"
            className="mt-3 inline-flex text-xs font-semibold uppercase tracking-widest text-sky-400 transition hover:text-sky-300"
          >
            See full board →
          </Link>
        </>
      ) : (
        <>
          <p className="text-sm text-zinc-400">Not ranked yet.</p>
          <Link
            href="/record"
            className="mt-3 inline-flex text-xs font-semibold uppercase tracking-widest text-sky-400 transition hover:text-sky-300"
          >
            Record to rank →
          </Link>
        </>
      )}
    </Card>
  );
}

function AttemptsCountCard({ count }: { count: number }) {
  return (
    <Card title="Attempts">
      <div className="flex items-baseline gap-2">
        <AnimatedNumber
          value={count}
          decimals={0}
          className="text-5xl font-bold"
        />
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          total
        </span>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        Unlimited attempts — only your best counts.
      </p>
    </Card>
  );
}

function Card({
  title,
  accent,
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`hover-lift rounded-2xl border p-5 ${
        accent
          ? "border-sky-500/30 bg-sky-500/[0.06]"
          : "border-zinc-800 bg-zinc-900/40"
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
        {title}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function RecentAttemptsTable({ attempts }: { attempts: Attempt[] }) {
  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-[11px] uppercase tracking-widest text-zinc-500">
            <th className="px-4 py-3 font-semibold">When</th>
            <th className="px-4 py-3 text-right font-semibold">Combined</th>
            <th className="px-4 py-3 text-right font-semibold">Valid</th>
            <th className="px-4 py-3 text-right font-semibold">Form</th>
            <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">
              Breaks
            </th>
          </tr>
        </thead>
        <tbody>
          {attempts.map((a) => (
            <tr
              key={a.id}
              className="border-b border-zinc-900/80 last:border-0"
            >
              <td className="px-4 py-3 text-zinc-300">
                <time dateTime={a.created_at}>{formatWhen(a.created_at)}</time>
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-sky-300">
                {a.combined_score.toFixed(1)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
                {a.valid_seconds.toFixed(1)}s
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
                {a.form_score.toFixed(0)}%
              </td>
              <td className="hidden px-4 py-3 text-right tabular-nums text-zinc-400 sm:table-cell">
                {a.breaks_count ?? 0}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmptyAttempts() {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
      <h3 className="text-lg font-semibold text-zinc-100">
        Nothing on file yet
      </h3>
      <p className="mt-1 text-sm text-zinc-400">
        Record your first plank to start building your record.
      </p>
      <Link
        href="/record"
        className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400"
      >
        Record now
      </Link>
    </div>
  );
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return `Today, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const sameAsYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();
  if (sameAsYesterday) {
    return `Yesterday, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === d.getFullYear() ? undefined : "numeric",
  });
}
