"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInErr) {
      setError(signInErr.message);
      setSubmitting(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-10">
      <Link
        href="/"
        className="text-xs uppercase tracking-widest text-zinc-500 hover:text-zinc-300"
      >
        ← Plank-Pro
      </Link>
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Log in</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Welcome back. Three attempts per athlete — best one counts.
      </p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Email
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Password
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>

        {error && (
          <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>

        <p className="text-xs text-zinc-500">
          New here?{" "}
          <Link href="/register" className="text-sky-400 hover:text-sky-300">
            Register
          </Link>
          .
        </p>
      </form>
    </main>
  );
}
