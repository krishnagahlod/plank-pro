"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  /** Target value to count up to. */
  value: number;
  /** Decimal places to render. Defaults to 0. */
  decimals?: number;
  /** Total duration of the count animation in ms. Defaults to 900. */
  durationMs?: number;
  /** Optional suffix appended after the number, e.g. "%", "s". */
  suffix?: string;
  /** Optional prefix prepended before the number, e.g. "#". */
  prefix?: string;
  className?: string;
};

/**
 * Counts up to `value` on mount with an ease-out curve. Renders the formatted
 * number (and any prefix/suffix) in a single span — no layout shift, and a
 * `tabular-nums` style so digits don't jitter horizontally.
 *
 * Honours `prefers-reduced-motion`: skips the animation and renders the final
 * value immediately.
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  durationMs = 900,
  suffix = "",
  prefix = "",
  className,
}: Props) {
  const [shown, setShown] = useState<number>(() => {
    if (typeof window === "undefined") return value;
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    return reduced ? value : 0;
  });
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const from = 0;
    const to = value;
    const tick = (now: number) => {
      const t = Math.min((now - start) / durationMs, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setShown(to);
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs]);

  return (
    <span className={`tabular-nums ${className ?? ""}`}>
      {prefix}
      {shown.toFixed(decimals)}
      {suffix}
    </span>
  );
}
