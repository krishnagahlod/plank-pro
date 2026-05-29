"use client";

import { useEffect } from "react";
import LiveSignals from "@/components/LiveSignals";
import type { EvalResult } from "@/lib/pose/plankState";

type Props = {
  open: boolean;
  onClose: () => void;
  diag: EvalResult | null;
};

/**
 * Mobile bottom-sheet that wraps LiveSignals so phone users can still see
 * hip / knee / elbow / quality details without permanently occupying screen
 * space. Closes on backdrop tap or Esc.
 */
export default function MobileStatsSheet({ open, onClose, diag }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      <div
        aria-hidden={!open}
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-200 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Live signals"
        className={`fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto rounded-t-2xl bg-zinc-950 px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-3 ring-1 ring-zinc-800 transition-transform duration-300 lg:hidden ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Live signals</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-xs font-medium text-zinc-400 transition hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-label="Close live signals"
          >
            Close
          </button>
        </div>
        <LiveSignals diag={diag} />
      </div>
    </>
  );
}
