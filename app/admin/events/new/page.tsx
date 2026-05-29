import Link from "next/link";
import EventForm from "@/components/EventForm";
import { createEvent } from "@/app/admin/events/actions";

type Props = {
  searchParams: { error?: string };
};

export default function NewEventPage({ searchParams }: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-8">
      <header className="flex items-center justify-between">
        <Link
          href="/admin/events"
          className="rounded text-xs uppercase tracking-widest text-zinc-500 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          ← All events
        </Link>
      </header>

      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">New event</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Drafts are saved hidden — toggle <em>Published</em> to make them
        public.
      </p>

      <EventForm action={createEvent} error={searchParams.error ?? null} />
    </main>
  );
}
