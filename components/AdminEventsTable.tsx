"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { deleteEvent, togglePublished } from "@/app/admin/events/actions";
import type { Event } from "@/types";

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default function AdminEventsTable({ rows }: { rows: Event[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 p-10 text-center">
        <h3 className="text-base font-semibold text-zinc-100">
          No events yet
        </h3>
        <p className="mt-1 text-sm text-zinc-400">
          Create your first event to get started.
        </p>
        <Link
          href="/admin/events/new"
          className="mt-5 inline-flex h-10 items-center justify-center rounded-full bg-sky-500 px-5 text-xs font-semibold text-zinc-950 transition hover:bg-sky-400"
        >
          + New event
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-zinc-900/60 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Mode</th>
            <th className="px-4 py-3">Starts</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3 text-right">Published</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Row key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Row({ row }: { row: Event }) {
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onToggle = () => {
    setError(null);
    startTransition(async () => {
      try {
        await togglePublished(row.id, row.is_published);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  };

  const onDelete = () => {
    if (
      !window.confirm(
        `Delete "${row.title}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    setError(null);
    startDeleting(async () => {
      try {
        await deleteEvent(row.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  };

  return (
    <tr className="border-t border-zinc-900 hover:bg-zinc-900/40">
      <td className="px-4 py-3">
        <div className="font-semibold text-zinc-100">{row.title}</div>
        <div className="text-xs text-zinc-500">/{row.slug}</div>
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${
            row.mode === "online"
              ? "bg-sky-500/15 text-sky-300"
              : "bg-emerald-500/15 text-emerald-300"
          }`}
        >
          {row.mode}
        </span>
      </td>
      <td className="px-4 py-3 text-zinc-300">
        {dateFormatter.format(new Date(row.starts_at))}
      </td>
      <td className="px-4 py-3 text-zinc-400">{row.location ?? "—"}</td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onToggle}
          disabled={isPending}
          className={`inline-flex h-8 items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-widest transition disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
            row.is_published
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 focus-visible:ring-emerald-300"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 focus-visible:ring-sky-400"
          }`}
        >
          {isPending ? "…" : row.is_published ? "Published" : "Draft"}
        </button>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="inline-flex items-center gap-2">
          <Link
            href={`/admin/events/${row.id}/edit`}
            className="inline-flex h-8 items-center rounded-full border border-zinc-700 px-3 text-[11px] font-semibold text-zinc-100 transition hover:border-zinc-500"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting}
            className="inline-flex h-8 items-center rounded-full bg-rose-500/15 px-3 text-[11px] font-semibold text-rose-300 ring-1 ring-rose-500/30 transition hover:bg-rose-500/25 disabled:cursor-wait disabled:opacity-60"
          >
            {isDeleting ? "…" : "Delete"}
          </button>
        </div>
        {error && (
          <div className="mt-1 text-[10px] text-rose-400">{error}</div>
        )}
      </td>
    </tr>
  );
}
