import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/admin/actions";
import AdminTable, { type AdminRow } from "@/components/AdminTable";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("leaderboard")
    .select(
      "user_id, full_name, city, valid_seconds, form_score, combined_score, created_at, is_shortlisted",
    )
    .order("combined_score", { ascending: false });

  const rows: AdminRow[] = (data ?? []).map((r) => ({
    user_id: r.user_id,
    full_name: r.full_name,
    city: r.city,
    valid_seconds: Number(r.valid_seconds),
    form_score: Number(r.form_score),
    combined_score: Number(r.combined_score),
    created_at: r.created_at,
    is_shortlisted: r.is_shortlisted,
  }));

  const shortlistedCount = rows.filter((r) => r.is_shortlisted).length;

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
        <span className="inline-flex h-8 items-center rounded-full bg-zinc-100 px-3 text-xs font-semibold text-zinc-950">
          Shortlist
        </span>
        <Link
          href="/admin/reviews"
          className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-100"
        >
          Review Queue
        </Link>
        <Link
          href="/admin/events"
          className="inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold text-zinc-400 transition hover:text-zinc-100"
        >
          Events
        </Link>
      </nav>

      <section className="mt-6 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Shortlist management</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Every athlete by best score. Toggle the shortlist to mark candidates
            for the next stage.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>
            <span className="font-bold tabular-nums text-zinc-100">
              {rows.length}
            </span>{" "}
            athlete{rows.length === 1 ? "" : "s"}
          </span>
          <span>·</span>
          <span>
            <span className="font-bold tabular-nums text-emerald-400">
              {shortlistedCount}
            </span>{" "}
            shortlisted
          </span>
        </div>
      </section>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
          Could not load athletes: {error.message}
        </div>
      )}

      <section className="mt-6">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-400">
            No athletes have completed an attempt yet.
          </div>
        ) : (
          <AdminTable rows={rows} />
        )}
      </section>
    </main>
  );
}
