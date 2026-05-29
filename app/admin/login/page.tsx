import Link from "next/link";
import { login } from "@/app/admin/actions";

type Props = {
  searchParams: { error?: string };
};

export default function AdminLoginPage({ searchParams }: Props) {
  const errorMsg = errorFor(searchParams.error);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
      <Link
        href="/"
        className="rounded text-xs uppercase tracking-widest text-zinc-500 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        ← Plank-Pro
      </Link>
      <h1 className="mt-6 text-3xl font-bold">Admin login</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Restricted to event organisers. Use the password from{" "}
        <code className="rounded bg-zinc-900 px-1.5 py-0.5 text-[12px] text-zinc-300">
          ADMIN_PASSWORD
        </code>
        .
      </p>

      <form action={login} className="mt-8 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-widest text-zinc-500">
            Password
          </span>
          <input
            type="password"
            name="password"
            required
            autoFocus
            autoComplete="current-password"
            className="h-11 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>

        {errorMsg && (
          <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Log in
        </button>
      </form>
    </main>
  );
}

function errorFor(code: string | undefined): string | null {
  switch (code) {
    case "wrong_password":
      return "Wrong password.";
    case "missing_env":
      return "Server is missing ADMIN_PASSWORD env var.";
    default:
      return null;
  }
}
