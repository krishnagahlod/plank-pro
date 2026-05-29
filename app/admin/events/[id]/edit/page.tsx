import Link from "next/link";
import { notFound } from "next/navigation";
import EventForm from "@/components/EventForm";
import { updateEvent } from "@/app/admin/events/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Event } from "@/types";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
  searchParams: { error?: string };
};

export default async function EditEventPage({ params, searchParams }: Props) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("events")
    .select(
      "id, slug, title, summary, description, mode, location, starts_at, ends_at, registration_url, cover_image_url, is_published, created_at, updated_at",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (error) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-2xl px-5 py-8">
        <p className="text-sm text-rose-300">
          Could not load event: {error.message}
        </p>
      </main>
    );
  }
  if (!data) {
    notFound();
  }

  const event = data as Event;
  const boundAction = updateEvent.bind(null, event.id);

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

      <h1 className="mt-6 text-3xl font-bold sm:text-4xl">Edit event</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Updates revalidate the public events page immediately.
      </p>

      <EventForm
        initial={event}
        action={boundAction}
        error={searchParams.error ?? null}
      />
    </main>
  );
}
