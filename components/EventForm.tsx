"use client";

import { useState } from "react";
import type { Event } from "@/types";

type Props = {
  initial?: Event | null;
  action: (formData: FormData) => void | Promise<void>;
  error?: string | null;
};

// Format an ISO timestamp to the local-time string the <input type="datetime-local"> expects.
function toLocalDatetimeValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const tzOffsetMs = d.getTimezoneOffset() * 60_000;
  return new Date(d.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

export default function EventForm({ initial, action, error }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [mode, setMode] = useState<"online" | "offline">(
    initial?.mode ?? "online",
  );

  const onTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setTitle(next);
    // Auto-fill slug only when creating new (no initial) and slug is still pristine
    // or matches the previous title-derived value.
    if (!initial && (!slug || slug === slugify(title))) {
      setSlug(slugify(next));
    }
  };

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      <Field label="Title">
        <input
          name="title"
          type="text"
          required
          value={title}
          onChange={onTitleChange}
          className={inputClass}
        />
      </Field>

      <Field
        label="Slug"
        hint="URL-safe id; auto-derived from title. Edit if you need a custom URL."
      >
        <div className="flex gap-2">
          <input
            name="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            pattern="[a-z0-9-]+"
            className={`${inputClass} flex-1`}
          />
          <button
            type="button"
            onClick={() => setSlug(slugify(title))}
            className="inline-flex h-11 items-center rounded-xl border border-zinc-700 px-3 text-xs font-semibold text-zinc-200 transition hover:border-zinc-500"
          >
            From title
          </button>
        </div>
      </Field>

      <Field label="Summary" hint="One-line teaser shown on the events page.">
        <input
          name="summary"
          type="text"
          required
          defaultValue={initial?.summary ?? ""}
          maxLength={200}
          className={inputClass}
        />
      </Field>

      <Field label="Description (optional, multi-line)">
        <textarea
          name="description"
          rows={5}
          defaultValue={initial?.description ?? ""}
          className={`${inputClass} resize-y py-2`}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Mode">
          <div className="flex gap-2">
            <ModeButton
              active={mode === "online"}
              onClick={() => setMode("online")}
            >
              Online
            </ModeButton>
            <ModeButton
              active={mode === "offline"}
              onClick={() => setMode("offline")}
            >
              Offline
            </ModeButton>
            <input type="hidden" name="mode" value={mode} />
          </div>
        </Field>

        <Field
          label="Location"
          hint={mode === "online" ? "e.g. Zoom, Discord" : "City, venue"}
        >
          <input
            name="location"
            type="text"
            defaultValue={initial?.location ?? ""}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts at">
          <input
            name="starts_at"
            type="datetime-local"
            required
            defaultValue={toLocalDatetimeValue(initial?.starts_at)}
            className={inputClass}
          />
        </Field>
        <Field label="Ends at (optional)">
          <input
            name="ends_at"
            type="datetime-local"
            defaultValue={toLocalDatetimeValue(initial?.ends_at)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field
        label="Registration URL (optional)"
        hint="External sign-up link. If empty, the card links to /register."
      >
        <input
          name="registration_url"
          type="url"
          defaultValue={initial?.registration_url ?? ""}
          className={inputClass}
        />
      </Field>

      <Field label="Cover image URL (optional)">
        <input
          name="cover_image_url"
          type="url"
          defaultValue={initial?.cover_image_url ?? ""}
          className={inputClass}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-zinc-200">
        <input
          type="checkbox"
          name="is_published"
          defaultChecked={initial?.is_published ?? false}
          className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-sky-500 focus:ring-sky-500"
        />
        Published (visible on public /events)
      </label>

      {error && (
        <div className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300 ring-1 ring-rose-500/30">
          {error}
        </div>
      )}

      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          {initial ? "Save changes" : "Create event"}
        </button>
        <a
          href="/admin/events"
          className="inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500"
        >
          Cancel
        </a>
      </div>
    </form>
  );
}

const inputClass =
  "h-11 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs uppercase tracking-widest text-zinc-500">
        {label}
      </span>
      {children}
      {hint && <span className="text-[11px] text-zinc-500">{hint}</span>}
    </label>
  );
}

function ModeButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold transition ${
        active
          ? "bg-zinc-100 text-zinc-950"
          : "border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}
