"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[plank-pro] route error:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center px-5 py-10">
      <span className="inline-flex items-center self-start rounded-full bg-rose-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-rose-300">
        Something went wrong
      </span>
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
        We hit an unexpected error.
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        Refresh or try again. If this keeps happening, take a screenshot and
        share it with the organisers.
      </p>
      {error.digest && (
        <code className="mt-3 inline-block rounded-md bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-400">
          Reference: {error.digest}
        </code>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
