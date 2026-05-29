"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FormState = {
  full_name: string;
  email: string;
  password: string;
  city: string;
  phone: string;
};

const empty: FormState = {
  full_name: "",
  email: "",
  password: "",
  city: "",
  phone: "",
};

export default function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/record";
  const [form, setForm] = useState<FormState>(empty);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpErr) {
      setError(signUpErr.message);
      setSubmitting(false);
      return;
    }
    if (!data.session) {
      setError(
        "Account created but no session was issued. If you enabled email confirmation in Supabase, disable it (see supabase/README.md step 3) or check your inbox.",
      );
      setSubmitting(false);
      return;
    }
    const userId = data.user?.id;
    if (!userId) {
      setError("Sign up succeeded but no user id was returned.");
      setSubmitting(false);
      return;
    }

    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      phone: form.phone.trim() || null,
    });

    if (profileErr) {
      setError(`Profile save failed: ${profileErr.message}`);
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
      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Register</h1>
      <p className="mt-2 text-sm text-zinc-400">
        One-time signup. Your best plank lands on the public leaderboard.
      </p>

      <form className="mt-8 flex flex-col gap-4" onSubmit={onSubmit}>
        <Field
          label="Full name"
          value={form.full_name}
          onChange={set("full_name")}
          required
        />
        <Field
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          required
        />
        <Field
          label="Password"
          type="password"
          value={form.password}
          onChange={set("password")}
          minLength={6}
          required
          hint="At least 6 characters."
        />
        <Field
          label="City"
          value={form.city}
          onChange={set("city")}
          required
        />
        <Field
          label="Phone (optional)"
          type="tel"
          value={form.phone}
          onChange={set("phone")}
        />

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
          {submitting ? "Creating account…" : "Create account"}
        </button>

        <p className="text-xs text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="text-sky-400 hover:text-sky-300">
            Log in
          </Link>
          .
        </p>
      </form>
    </main>
  );
}

function Field({
  label,
  hint,
  ...inputProps
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      <input
        {...inputProps}
        className="h-11 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
      />
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}
