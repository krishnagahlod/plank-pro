"use client";

import { useMemo, useState, useTransition } from "react";
import { setShortlisted } from "@/app/admin/actions";

export type AdminRow = {
  user_id: string;
  full_name: string;
  city: string;
  valid_seconds: number;
  form_score: number;
  combined_score: number;
  created_at: string;
  is_shortlisted: boolean;
};

type Filter = "all" | "shortlisted" | "not_shortlisted";

type Props = { rows: AdminRow[] };

export default function AdminTable({ rows }: Props) {
  const [cityFilter, setCityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<Filter>("all");

  const withRank = useMemo(
    () => rows.map((r, i) => ({ ...r, rank: i + 1 })),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = cityFilter.trim().toLowerCase();
    return withRank.filter((r) => {
      if (q && !r.city.toLowerCase().includes(q)) return false;
      if (statusFilter === "shortlisted" && !r.is_shortlisted) return false;
      if (statusFilter === "not_shortlisted" && r.is_shortlisted) return false;
      return true;
    });
  }, [withRank, cityFilter, statusFilter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="flex flex-col gap-1 sm:max-w-xs sm:flex-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Filter by city
          </span>
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            placeholder="Mumbai, Delhi, …"
            className="h-10 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <StatusButton
            active={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
          >
            All
          </StatusButton>
          <StatusButton
            active={statusFilter === "shortlisted"}
            onClick={() => setStatusFilter("shortlisted")}
          >
            Shortlisted
          </StatusButton>
          <StatusButton
            active={statusFilter === "not_shortlisted"}
            onClick={() => setStatusFilter("not_shortlisted")}
          >
            Not shortlisted
          </StatusButton>
          <button
            type="button"
            onClick={() => exportCsv(filtered)}
            className="inline-flex h-9 items-center rounded-full bg-emerald-500 px-4 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl ring-1 ring-zinc-800">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/60 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Athlete</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3 text-right">Valid</th>
              <th className="px-4 py-3 text-right">Form</th>
              <th className="px-4 py-3 text-right">Score</th>
              <th className="px-4 py-3 text-right">Shortlist</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <Row key={r.user_id} row={r} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  No athletes match those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ row }: { row: AdminRow & { rank: number } }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onToggle = () => {
    setError(null);
    startTransition(async () => {
      try {
        await setShortlisted(row.user_id, !row.is_shortlisted);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed");
      }
    });
  };

  return (
    <tr className="border-t border-zinc-900 hover:bg-zinc-900/40">
      <td className="px-4 py-3 font-bold tabular-nums text-zinc-300">
        #{row.rank}
      </td>
      <td className="px-4 py-3 text-zinc-100">{row.full_name}</td>
      <td className="px-4 py-3 text-zinc-400">{row.city}</td>
      <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
        {row.valid_seconds.toFixed(1)}s
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
        {row.form_score.toFixed(0)}%
      </td>
      <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-sky-300">
        {row.combined_score.toFixed(1)}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={onToggle}
          disabled={isPending}
          className={`inline-flex h-8 items-center rounded-full px-3 text-[11px] font-semibold uppercase tracking-widest transition disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
            row.is_shortlisted
              ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/30 focus-visible:ring-emerald-300"
              : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 focus-visible:ring-sky-400"
          }`}
        >
          {isPending
            ? "…"
            : row.is_shortlisted
              ? "Shortlisted"
              : "Shortlist"}
        </button>
        {error && (
          <div className="mt-1 text-[10px] text-rose-400">{error}</div>
        )}
      </td>
    </tr>
  );
}

function StatusButton({
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
      className={`inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
        active
          ? "bg-zinc-100 text-zinc-950"
          : "border border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      {children}
    </button>
  );
}

function exportCsv(rows: Array<AdminRow & { rank: number }>) {
  const header = [
    "rank",
    "full_name",
    "city",
    "valid_seconds",
    "form_score",
    "combined_score",
    "is_shortlisted",
    "recorded_at",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.rank,
        csvField(r.full_name),
        csvField(r.city),
        r.valid_seconds.toFixed(2),
        r.form_score.toFixed(2),
        r.combined_score.toFixed(2),
        r.is_shortlisted ? "true" : "false",
        r.created_at,
      ].join(","),
    );
  }
  const csv = lines.join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `plank-pro-athletes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvField(s: string): string {
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
