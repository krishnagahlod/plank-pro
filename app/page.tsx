import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PlankIllustration from "@/components/PlankIllustration";

export const dynamic = "force-dynamic";

export default async function Home() {
  // Logged-in users land on their dashboard, not the marketing page.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-950 text-zinc-50">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[70vh] bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_55%)]"
      />

      <header className="relative z-10 border-b border-zinc-900/80 bg-zinc-950/60 backdrop-blur">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"
        >
          <Link
            href="/"
            className="text-sm font-bold tracking-[0.2em] text-sky-400 outline-none transition focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 rounded"
          >
            PLANK-PRO
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/leaderboard"
              className="hidden h-10 items-center rounded-full px-3 text-sm font-semibold text-zinc-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 sm:inline-flex"
            >
              Leaderboard
            </Link>
            <Link
              href="/events"
              className="inline-flex h-10 items-center rounded-full px-3 text-sm font-semibold text-zinc-300 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Events
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-full border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Log in
            </Link>
          </div>
        </nav>
      </header>

      <main
        id="main"
        className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-5 sm:px-8"
      >
        <section className="grid items-center gap-10 pt-14 pb-16 sm:pt-20 sm:pb-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14">
          <div className="animate-fade-up">
            <span className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-300">
              Selection round · v0.1
            </span>
            <h1 className="mt-5 text-balance text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
              Hold the line.
              <br />
              <span className="text-sky-400">Make the cut.</span>
            </h1>
            <p className="animate-fade-up delay-100 mt-5 max-w-xl text-base text-zinc-300 sm:text-lg">
              Record a live plank through your webcam. Our AI scores your form
              and duration in real time. Your highest score lands on the
              public leaderboard.
            </p>

            <div className="animate-fade-up delay-200 mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register"
                className="animate-glow-cta inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-7 text-sm font-semibold text-zinc-950 shadow-lg shadow-sky-500/20 transition hover:scale-[1.02] hover:bg-sky-400 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                Register &amp; record
              </Link>
              <Link
                href="/leaderboard"
                className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-7 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              >
                View leaderboard
              </Link>
            </div>
          </div>

          <div className="animate-fade-up delay-300 relative">
            <div
              aria-hidden
              className="absolute -inset-6 -z-10 rounded-3xl bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.22),_transparent_70%)] blur-2xl"
            />
            <PlankIllustration variant="hero" className="h-auto w-full" />
          </div>
        </section>

        <section
          aria-labelledby="how-it-works"
          className="border-t border-zinc-900 py-14"
        >
          <h2
            id="how-it-works"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400"
          >
            How it works
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            <Step
              n={1}
              title="Register"
              body="Name, email, city — under a minute."
            />
            <Step
              n={2}
              title="Record"
              body="Side-on webcam plank, scored frame-by-frame."
            />
            <Step
              n={3}
              title="Rank"
              body="Best score lands on the public leaderboard."
            />
          </ol>
        </section>
      </main>

      <footer className="relative z-10 border-t border-zinc-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 text-xs text-zinc-500 sm:px-8">
          <span>Hold as long as you can. Best score counts.</span>
          <Link
            href="/admin"
            className="rounded text-zinc-400 transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Admin
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li
      className="hover-lift animate-fade-up rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5"
      style={{ animationDelay: `${n * 100}ms` }}
    >
      <div
        aria-hidden
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sm font-bold text-sky-300"
      >
        {n}
      </div>
      <div className="mt-3 text-base font-semibold text-zinc-100">{title}</div>
      <p className="mt-1 text-sm text-zinc-400">{body}</p>
    </li>
  );
}

