import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { logout } from "@/app/admin/actions";
import AdminEventsTable from "@/components/AdminEventsTable";
import type { Event } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminEventsPage() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select(
      "id, slug, title, summary, description, mode, location, starts_at, ends_at, registration_url, cover_image_url, is_published, created_at, updated_at",
    )
    .order("starts_at", { ascending: false });

  const rows: Event[] = (data ?? []) as Event[];

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
            className="inline-flex h-9 items-center rounded-full border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500 hover:text-white"
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
          Events
        </span>
      </nav>

      <section className="mt-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Events</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Manage upcoming and past events. Drafts stay hidden from the
            public page until published.
          </p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex h-10 items-center rounded-full bg-sky-500 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-sky-400"
        >
          + New event
        </Link>
      </section>

      {error && (
        <div className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
          Could not load events: {error.message}
        </div>
      )}

      <section className="mt-6">
        <AdminEventsTable rows={rows} />
      </section>
    </main>
  );
}
