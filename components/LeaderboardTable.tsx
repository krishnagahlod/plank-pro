"use client";

import { useMemo, useState } from "react";

export type LeaderboardRow = {
  user_id: string;
  full_name: string;
  city: string;
  valid_seconds: number;
  form_score: number;
  combined_score: number;
  created_at: string;
  is_shortlisted: boolean;
};

type SortKey = "combined_score" | "valid_seconds" | "form_score" | "full_name" | "city";
type SortDir = "asc" | "desc";

type Props = {
  rows: LeaderboardRow[];
  viewerId: string | null;
};

export default function LeaderboardTable({ rows, viewerId }: Props) {
  const [cityFilter, setCityFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("combined_score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Each row keeps its server-side rank (1-based by combined_score desc) so
  // sorting client-side doesn't lose that information.
  const withRank = useMemo(
    () => rows.map((r, i) => ({ ...r, rank: i + 1 })),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = cityFilter.trim().toLowerCase();
    if (!q) return withRank;
    return withRank.filter((r) => r.city.toLowerCase().includes(q));
  }, [withRank, cityFilter]);

  const sorted = useMemo(() => {
    const out = [...filtered];
    out.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "full_name":
        case "city":
          cmp = a[sortKey].localeCompare(b[sortKey]);
          break;
        case "combined_score":
        case "valid_seconds":
        case "form_score":
          cmp = a[sortKey] - b[sortKey];
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      // Numeric defaults to desc (highest first), text defaults to asc.
      setSortDir(key === "full_name" || key === "city" ? "asc" : "desc");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
        <span className="text-xs text-zinc-500">
          {sorted.length} of {rows.length} athletes
        </span>
      </div>

      {/* Desktop / tablet: table */}
      <div className="hidden overflow-hidden rounded-2xl ring-1 ring-zinc-800 sm:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-900/60 text-left text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
              <th className="px-4 py-3">Rank</th>
              <SortableTh
                label="Athlete"
                col="full_name"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
              />
              <SortableTh
                label="City"
                col="city"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
              />
              <SortableTh
                label="Valid"
                col="valid_seconds"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortableTh
                label="Form"
                col="form_score"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <SortableTh
                label="Score"
                col="combined_score"
                sortKey={sortKey}
                sortDir={sortDir}
                onClick={toggleSort}
                align="right"
              />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
              const isMe = r.user_id === viewerId;
              return (
                <tr
                  key={r.user_id}
                  className={`border-t border-zinc-900 ${isMe ? "bg-sky-500/10" : "hover:bg-zinc-900/40"}`}
                >
                  <td className="px-4 py-3 font-bold tabular-nums text-zinc-300">
                    #{r.rank}
                  </td>
                  <td className="px-4 py-3 text-zinc-100">
                    {r.full_name}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                        you
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{r.city}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
                    {r.valid_seconds.toFixed(1)}s
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-zinc-200">
                    {r.form_score.toFixed(0)}%
                  </td>
                  <td className="px-4 py-3 text-right text-base font-bold tabular-nums text-sky-300">
                    {r.combined_score.toFixed(1)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {r.is_shortlisted && (
                      <span className="inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                        shortlisted
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {sorted.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-8 text-center text-sm text-zinc-500"
                >
                  No athletes match that filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <ul className="flex flex-col gap-2 sm:hidden">
        {sorted.map((r) => {
          const isMe = r.user_id === viewerId;
          return (
            <li
              key={r.user_id}
              className={`rounded-2xl p-4 ring-1 ${isMe ? "bg-sky-500/10 ring-sky-500/30" : "bg-zinc-900/60 ring-zinc-800"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tabular-nums text-zinc-400">
                      #{r.rank}
                    </span>
                    <span className="truncate text-sm font-semibold text-zinc-100">
                      {r.full_name}
                    </span>
                    {isMe && (
                      <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300">
                        you
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">{r.city}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold tabular-nums text-sky-300">
                    {r.combined_score.toFixed(1)}
                  </div>
                  {r.is_shortlisted && (
                    <span className="mt-0.5 inline-flex rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                      shortlisted
                    </span>
                  )}
                </div>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-zinc-950/40 px-2.5 py-1.5">
                  <dt className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Valid
                  </dt>
                  <dd className="tabular-nums text-zinc-100">
                    {r.valid_seconds.toFixed(1)}s
                  </dd>
                </div>
                <div className="rounded-lg bg-zinc-950/40 px-2.5 py-1.5">
                  <dt className="text-[10px] uppercase tracking-widest text-zinc-500">
                    Form
                  </dt>
                  <dd className="tabular-nums text-zinc-100">
                    {r.form_score.toFixed(0)}%
                  </dd>
                </div>
              </dl>
            </li>
          );
        })}
        {sorted.length === 0 && (
          <li className="rounded-2xl bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500 ring-1 ring-zinc-800">
            No athletes match that filter.
          </li>
        )}
      </ul>
    </div>
  );
}

function SortableTh({
  label,
  col,
  sortKey,
  sortDir,
  onClick,
  align,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (col: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sortKey === col;
  const indicator = !active ? "" : sortDir === "asc" ? " ↑" : " ↓";
  return (
    <th
      className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}
    >
      <button
        type="button"
        onClick={() => onClick(col)}
        className={`inline-flex items-center gap-1 transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${active ? "text-sky-300" : ""}`}
      >
        {label}
        <span className="font-normal tabular-nums">{indicator}</span>
      </button>
    </th>
  );
}
