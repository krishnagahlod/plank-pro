import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <span className="inline-flex items-center self-start rounded-full bg-zinc-800 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-300">
        404
      </span>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
        That page doesn&apos;t exist.
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        The link you followed may be broken, or the page may have moved.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Go home
        </Link>
        <Link
          href="/leaderboard"
          className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          View leaderboard
        </Link>
      </div>
    </main>
  );
}
