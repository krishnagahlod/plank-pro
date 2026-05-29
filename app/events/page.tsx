import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Event } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events",
  description:
    "Upcoming and past Plank-Pro events — online practice rounds, regional qualifiers, and in-person competitions.",
};

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function EventsPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("events")
    .select(
      "id, slug, title, summary, description, mode, location, starts_at, ends_at, registration_url, cover_image_url, is_published, created_at, updated_at",
    )
    .eq("is_published", true)
    .order("starts_at", { ascending: false });

  const rows: Event[] = (data ?? []) as Event[];
  const now = Date.now();
  const upcoming = rows
    .filter((e) => new Date(e.starts_at).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
    );
  const past = rows
    .filter((e) => new Date(e.starts_at).getTime() < now)
    .sort(
      (a, b) =>
        new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
    );

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Link
          href="/"
          className="rounded text-xs uppercase tracking-widest text-zinc-500 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          ← Plank-Pro
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex h-9 items-center rounded-full border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500"
        >
          Leaderboard
        </Link>
      </header>

      <section className="mt-6">
        <h1 className="text-3xl font-bold sm:text-4xl">Events</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Practice rounds, regional qualifiers, and in-person competitions.
          Online events count toward your leaderboard rank; offline events feed
          into the league&apos;s next stages.
        </p>
      </section>

      {rows.length === 0 && (
        <div className="mt-8 rounded-2xl border border-dashed border-zinc-800 p-10 text-center text-sm text-zinc-400">
          No events scheduled yet. Check back soon.
        </div>
      )}

      {upcoming.length > 0 && (
        <Section title="Upcoming" events={upcoming} highlight />
      )}
      {past.length > 0 && <Section title="Past" events={past} dim />}
    </main>
  );
}

function Section({
  title,
  events,
  highlight,
  dim,
}: {
  title: string;
  events: Event[];
  highlight?: boolean;
  dim?: boolean;
}) {
  return (
    <section className="mt-8">
      <h2
        className={`text-xs font-semibold uppercase tracking-[0.2em] ${
          highlight ? "text-sky-300" : "text-zinc-500"
        }`}
      >
        {title}
      </h2>
      <ul className={`mt-4 grid gap-3 ${dim ? "opacity-70" : ""}`}>
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </ul>
    </section>
  );
}

function EventCard({ event: e }: { event: Event }) {
  const startsAt = new Date(e.starts_at);
  const endsAt = e.ends_at ? new Date(e.ends_at) : null;
  const dateLabel =
    endsAt && endsAt.toDateString() !== startsAt.toDateString()
      ? `${dateFormatter.format(startsAt)} → ${dateFormatter.format(endsAt)}`
      : dateFormatter.format(startsAt);

  const isOnline = e.mode === "online";

  return (
    <li className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 transition hover:border-zinc-700">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
                isOnline
                  ? "bg-sky-500/15 text-sky-300"
                  : "bg-emerald-500/15 text-emerald-300"
              }`}
            >
              {isOnline ? "Online" : "Offline"}
            </span>
            <span className="text-xs text-zinc-500">{dateLabel}</span>
            {e.location && (
              <span className="text-xs text-zinc-500">· {e.location}</span>
            )}
          </div>
          <h3 className="mt-2 text-lg font-semibold text-zinc-100">
            {e.title}
          </h3>
          <p className="mt-1 text-sm text-zinc-400">{e.summary}</p>
          {e.description && (
            <p className="mt-2 whitespace-pre-line text-sm text-zinc-500">
              {e.description}
            </p>
          )}
        </div>
        <div className="sm:shrink-0">
          {e.registration_url ? (
            <a
              href={e.registration_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-full bg-sky-500 px-5 text-xs font-semibold text-zinc-950 transition hover:bg-sky-400"
            >
              Register →
            </a>
          ) : (
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-full border border-zinc-700 px-5 text-xs font-semibold text-zinc-100 transition hover:border-zinc-500"
            >
              Sign up
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
