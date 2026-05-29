"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import PoseCamera from "@/components/PoseCamera";
import { getDetector } from "@/lib/pose/detector";
import PlankTimer, { usePlankTimer } from "@/components/PlankTimer";
import LiveSignals from "@/components/LiveSignals";
import VoiceToggle from "@/components/VoiceToggle";
import BigTimer from "@/components/BigTimer";
import MobileStatsSheet from "@/components/MobileStatsSheet";
import { announcer, milestoneText } from "@/lib/voice/announcer";
import type { AttemptScore } from "@/lib/pose/scoring";
import type { Keypoint } from "@/lib/pose/detector";
import { evaluatePose } from "@/lib/pose/plankState";
import type { EvalResult, PoseReason, StateKind } from "@/lib/pose/plankState";
import { createAttemptSessionAction } from "./actions";
import PlankIllustration from "@/components/PlankIllustration";

type Phase = "intro" | "setup" | "calibration" | "recording";
type CompletionKind = "COMPLETED" | "DISQUALIFIED";

export type PendingAttempt = AttemptScore & {
  kind: CompletionKind;
  attempt_type: "practice" | "official";
  event_id: string | null;
  session_id: string | null;
  recordedAt: number;
  snapshots?: { timestamp: number; image: string; type: string }[];
  device_metadata: {
    browser: string;
    os: string;
    resolution: string;
    fpsAvg: number;
    fpsMin: number;
    tabVisibilityChanges: number;
    pageFocusLost: number;
  };
};

type Props = {
  userName: string;
  attemptNumber: number;
  events: Array<{ id: string; title: string; slug: string }>;
};

export default function RecordingClient({ userName, attemptNumber, events }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [diag, setDiag] = useState<EvalResult | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  
  // Anti-Cheat & Modes State
  const [attemptType, setAttemptType] = useState<"practice" | "official">("practice");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Browser Telemetry Refs (avoid re-renders during recording loop)
  const tabVisibilityChangesRef = useRef(0);
  const pageFocusLostRef = useRef(0);
  const frameTimesRef = useRef<number[]>([]);
  const getSnapshotRef = useRef<(() => string | null) | null>(null);
  const snapshotsRef = useRef<{ timestamp: number; image: string; type: string }[]>([]);
  const lastSnapshotTimeRef = useRef(0);

  const captureSnapshot = useCallback((type: string) => {
    if (attemptType !== "official" || !getSnapshotRef.current) return;
    const img = getSnapshotRef.current();
    if (img) {
      snapshotsRef.current.push({
        timestamp: Date.now(),
        image: img,
        type,
      });
    }
  }, [attemptType]);

  // Pre-attempt Calibration State
  const [calibrationValidSeconds, setCalibrationValidSeconds] = useState(0);
  const [calibrationPassed, setCalibrationPassed] = useState(false);
  const calibrationPassedRef = useRef(false);

  const [isLandscape, setIsLandscape] = useState(true);
  const [isSmallViewport, setIsSmallViewport] = useState(false);
  const prevKindRef = useRef<StateKind | null>(null);
  const lastMilestoneRef = useRef(0);

  // Monitor Browser Focus & Hidden states during official attempts
  useEffect(() => {
    if (phase !== "recording" || attemptType !== "official") return;

    const handleVisibility = () => {
      if (document.hidden) {
        tabVisibilityChangesRef.current += 1;
      }
    };

    const handleBlur = () => {
      pageFocusLostRef.current += 1;
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
    };
  }, [phase, attemptType]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const landMql = window.matchMedia("(orientation: landscape)");
    const sizeMql = window.matchMedia("(max-width: 1023px)");
    const updateLand = () => setIsLandscape(landMql.matches);
    const updateSize = () => setIsSmallViewport(sizeMql.matches);
    updateLand();
    updateSize();
    landMql.addEventListener("change", updateLand);
    sizeMql.addEventListener("change", updateSize);
    return () => {
      landMql.removeEventListener("change", updateLand);
      sizeMql.removeEventListener("change", updateSize);
    };
  }, []);

  const handleComplete = useCallback(
    (score: AttemptScore, kind: CompletionKind) => {
      // Calculate technical FPS logs
      const frameTimes = frameTimesRef.current;
      let fpsAvg = 30;
      let fpsMin = 30;
      if (frameTimes.length > 0) {
        const totalDuration = frameTimes.reduce((s, x) => s + x, 0) / 1000;
        fpsAvg = totalDuration > 0 ? frameTimes.length / totalDuration : 30;
        const maxFrameTime = Math.max(...frameTimes);
        fpsMin = maxFrameTime > 0 ? 1000 / maxFrameTime : 30;
      }

      // Basic browser & operating system detection
      let browser = "unknown";
      let os = "unknown";
      if (typeof window !== "undefined") {
        const ua = window.navigator.userAgent.toLowerCase();
        if (ua.includes("chrome")) browser = "chrome";
        else if (ua.includes("safari") && !ua.includes("chrome")) browser = "safari";
        else if (ua.includes("firefox")) browser = "firefox";
        else if (ua.includes("edge")) browser = "edge";

        if (ua.includes("win")) os = "windows";
        else if (ua.includes("mac")) os = "macos";
        else if (ua.includes("linux")) os = "linux";
        else if (ua.includes("android")) os = "android";
        else if (ua.includes("iphone") || ua.includes("ipad")) os = "ios";
      }

      const payload: PendingAttempt = {
        ...score,
        kind,
        attempt_type: attemptType,
        event_id: selectedEventId,
        session_id: sessionId,
        recordedAt: Date.now(),
        snapshots: snapshotsRef.current,
        device_metadata: {
          browser,
          os,
          resolution: typeof window !== "undefined" ? `${window.innerWidth}x${window.innerHeight}` : "unknown",
          fpsAvg: Math.round(fpsAvg * 100) / 100,
          fpsMin: Math.round(fpsMin * 100) / 100,
          tabVisibilityChanges: tabVisibilityChangesRef.current,
          pageFocusLost: pageFocusLostRef.current,
        },
      };
      sessionStorage.setItem("pendingAttempt", JSON.stringify(payload));
      router.push("/result");
    },
    [router, attemptType, selectedEventId, sessionId],
  );

  const timer = usePlankTimer({ onComplete: handleComplete });

  const handlePose = useCallback(
    (kps: Keypoint[], dtMs: number) => {
      if (phase === "calibration") {
        const ev = evaluatePose(kps);
        setDiag(ev);

        if (calibrationPassedRef.current) return;

        const dt = dtMs / 1000;
        if (ev.formValid) {
          setCalibrationValidSeconds((prev) => {
            const next = prev + dt;
            if (next >= 3.0 && !calibrationPassedRef.current) {
              calibrationPassedRef.current = true;
              setCalibrationPassed(true);
              announcer.announce("transition", "Calibration successful. Starting attempt.");
              setTimeout(() => {
                beginRecordingRef.current?.();
              }, 2000);
              return 3.0;
            }
            return next;
          });
        } else {
          // Penalize invalid frames but don't instantly reset, so tiny tracking glitches
          // don't completely reset a user's calibration progress.
          setCalibrationValidSeconds((prev) => Math.max(0, prev - dt * 2));
        }
      } else if (phase === "recording") {
        frameTimesRef.current.push(dtMs);
        timer.tick(kps, dtMs);

        // Capture periodic snapshot every 15 seconds
        const currentSeconds = timer.state.totalSeconds;
        if (currentSeconds - lastSnapshotTimeRef.current >= 15) {
          lastSnapshotTimeRef.current = currentSeconds;
          captureSnapshot("periodic");
        }
      }
    },
    [phase, timer, captureSnapshot],
  );

  const handleStartPractice = () => {
    setAttemptType("practice");
    setSelectedEventId(null);
    setSessionId(null);
    tabVisibilityChangesRef.current = 0;
    pageFocusLostRef.current = 0;
    frameTimesRef.current = [];
    
    if (isSmallViewport) {
      setPhase("setup");
      return;
    }
    setCalibrationValidSeconds(0);
    setCalibrationPassed(false);
    calibrationPassedRef.current = false;
    setPhase("calibration");
  };

  const handleStartOfficial = async (eventId: string) => {
    try {
      setAttemptType("official");
      setSelectedEventId(eventId);
      tabVisibilityChangesRef.current = 0;
      pageFocusLostRef.current = 0;
      frameTimesRef.current = [];
      snapshotsRef.current = [];
      lastSnapshotTimeRef.current = 0;

      // Await cryptographic attempt session from Server
      const res = await createAttemptSessionAction(eventId);
      setSessionId(res.sessionId);

      if (isSmallViewport) {
        setPhase("setup");
        return;
      }
      setCalibrationValidSeconds(0);
      setCalibrationPassed(false);
      calibrationPassedRef.current = false;
      setPhase("calibration");
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Failed to start secure official attempt: ${errMsg}`);
    }
  };

  const beginRecordingRef = useRef<(() => void) | null>(null);

  const beginRecording = () => {
    // Only proceed if we aren't already recording
    if (phase === "recording") return;
    timer.reset();
    announcer.resetCooldowns();
    lastMilestoneRef.current = 0;
    setPhase("recording");
    timer.start();
    announcer.announce("start", "Recording started");
    
    // Capture start snapshot
    setTimeout(() => captureSnapshot("start"), 100);
  };
  beginRecordingRef.current = beginRecording;

  const onStop = () => timer.stop();
  const stopEnabled =
    timer.state.kind === "IN_PLANK" || timer.state.kind === "WARNING";

  useEffect(() => {
    const prev = prevKindRef.current;
    const next = timer.state.kind;
    if (prev === next) return;
    prevKindRef.current = next;
    if (prev === null) return;

    if (prev === "READY" && next === "IN_PLANK") {
      announcer.announce("transition", "Recording started");
    } else if (prev === "IN_PLANK" && next === "WARNING") {
      announcer.announce("warn", warnTextFor(timer.state.lastReason));
      captureSnapshot("warning");
    } else if (prev === "WARNING" && next === "IN_PLANK") {
      announcer.announce("transition", "Good, keep going");
      captureSnapshot("recovery");
    } else if (next === "COMPLETED") {
      announcer.announce("end", "Attempt complete");
      captureSnapshot("end");
    } else if (next === "DISQUALIFIED") {
      announcer.announce("end", "Time exceeded, attempt ended");
      captureSnapshot("end");
    }
  }, [timer.state.kind, timer.state.lastReason, captureSnapshot]);

  useEffect(() => {
    if (timer.state.kind !== "IN_PLANK" && timer.state.kind !== "WARNING") {
      return;
    }
    const reached = Math.floor(timer.state.validSeconds / 30);
    if (reached > lastMilestoneRef.current) {
      lastMilestoneRef.current = reached;
      const seconds = reached * 30;
      const text = milestoneText(seconds);
      if (text) announcer.announce("milestone", text);
    }
  }, [timer.state.kind, timer.state.validSeconds]);

  useEffect(() => {
    void getDetector().catch(() => {});
  }, []);

  useEffect(() => {
    if (!stopEnabled) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [stopEnabled]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1600px] px-4 py-4 sm:px-6 sm:py-5">
      <header
        className={`items-center justify-between ${
          phase === "recording" || phase === "calibration" ? "hidden lg:flex" : "flex"
        }`}
      >
        <Link
          href="/dashboard"
          className="rounded text-xs uppercase tracking-widest text-zinc-500 transition hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          ← Dashboard
        </Link>
        <span className="text-xs text-zinc-500">
          {userName} · attempt #{attemptNumber} {attemptType === "official" ? "(Official)" : "(Practice)"}
        </span>
      </header>

      {phase === "intro" && (
        <Intro
          events={events}
          onStartPractice={handleStartPractice}
          onStartOfficial={handleStartOfficial}
        />
      )}

      {(phase === "setup" || phase === "calibration" || phase === "recording") && (
        <>
          <div className="lg:mt-4 lg:grid lg:gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:[grid-template-rows:minmax(0,1fr)]">
            <div className="fixed inset-0 z-30 h-[100dvh] lg:relative lg:inset-auto lg:z-auto lg:h-[calc(100vh-7rem)]">
              <PoseCamera
                onPose={handlePose}
                onEval={setDiag}
                paused={timer.state.kind === "IDLE" && phase !== "calibration"}
                getSnapshotRef={getSnapshotRef}
              />

              {/* Mobile Overlays */}
              <div className="pointer-events-none absolute inset-0 z-20 lg:hidden">
                {phase === "setup" && (
                  <SetupOverlay
                    isLandscape={isLandscape}
                    onReady={beginRecording}
                    userName={userName}
                    attemptNumber={attemptNumber}
                  />
                )}

                {phase === "calibration" && (
                  <MobileCalibrationOverlay
                    diag={diag}
                    validSeconds={calibrationValidSeconds}
                    passed={calibrationPassed}
                    onStart={beginRecording}
                  />
                )}

                {phase === "recording" && (
                  <>
                    <MobileHeader
                      userName={userName}
                      attemptNumber={attemptNumber}
                      onOpenDetails={() => setStatsOpen(true)}
                    />

                    <div className="absolute inset-x-0 top-14 flex justify-center px-3">
                      <BigTimer state={timer.state} />
                    </div>

                    <MobileFooter
                      onStop={onStop}
                      stopEnabled={stopEnabled}
                    />

                    {!isLandscape && <PortraitNudge />}
                  </>
                )}
              </div>
            </div>

            {/* Desktop sidebar */}
            <div className="hidden lg:flex lg:flex-col lg:gap-3 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
              <div className="flex items-center justify-end">
                <VoiceToggle />
              </div>

              {phase === "calibration" ? (
                <DesktopCalibrationPanel
                  diag={diag}
                  validSeconds={calibrationValidSeconds}
                  passed={calibrationPassed}
                  onStart={beginRecording}
                />
              ) : (
                <>
                  <PlankTimer state={timer.state} />
                  <LiveSignals diag={diag} />
                  <button
                    type="button"
                    onClick={onStop}
                    disabled={!stopEnabled}
                    className="mt-auto inline-flex h-12 items-center justify-center rounded-full bg-rose-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
                  >
                    Stop attempt
                  </button>
                </>
              )}
            </div>
          </div>

          {phase === "recording" && (
            <MobileStatsSheet
              open={statsOpen}
              onClose={() => setStatsOpen(false)}
              diag={diag}
            />
          )}
        </>
      )}
    </main>
  );
}

function MobileHeader({
  userName,
  attemptNumber,
  onOpenDetails,
}: {
  userName: string;
  attemptNumber: number;
  onOpenDetails: () => void;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 top-0 flex items-center justify-between gap-2 bg-gradient-to-b from-black/80 via-black/35 to-transparent px-3 pb-4 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <Link
        href="/dashboard"
        className="rounded-full bg-zinc-950/60 px-3 py-1 text-[11px] uppercase tracking-widest text-zinc-200 backdrop-blur transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
      >
        ← Back
      </Link>
      <span className="hidden truncate rounded-full bg-zinc-950/60 px-3 py-1 text-[11px] text-zinc-200 backdrop-blur sm:inline">
        {userName} · #{attemptNumber}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenDetails}
          aria-label="Open live signals"
          className="inline-flex h-9 items-center justify-center gap-1 rounded-full bg-zinc-950/60 px-3 text-[11px] font-semibold text-zinc-100 backdrop-blur transition hover:bg-zinc-900/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
        >
          <span aria-hidden>📊</span>
          <span>Details</span>
        </button>
        <VoiceToggle variant="overlay" />
      </div>
    </div>
  );
}

function MobileFooter({
  onStop,
  stopEnabled,
}: {
  onStop: () => void;
  stopEnabled: boolean;
}) {
  return (
    <div className="pointer-events-auto absolute inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-10">
      <button
        type="button"
        onClick={onStop}
        disabled={!stopEnabled}
        className="inline-flex h-12 w-full max-w-md items-center justify-center rounded-full bg-rose-500 px-6 text-base font-semibold text-zinc-950 shadow-lg shadow-rose-900/30 transition hover:bg-rose-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        Stop attempt
      </button>
    </div>
  );
}

function SetupOverlay({
  isLandscape,
  onReady,
  userName,
  attemptNumber,
}: {
  isLandscape: boolean;
  onReady: () => void;
  userName: string;
  attemptNumber: number;
}) {
  if (!isLandscape) {
    return (
      <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 px-6 text-center">
        <RotatePhoneIcon className="h-24 w-24 text-sky-400" />
        <h2 className="mt-6 text-2xl font-bold text-zinc-50">
          Rotate your phone
        </h2>
        <p className="mt-3 max-w-xs text-sm text-zinc-400">
          Planks are scored side-on. Turn your phone to landscape, prop it up,
          and we&apos;ll continue.
        </p>
        <p className="mt-6 text-[11px] text-zinc-500">
          If portrait is locked, unlock rotation in your OS control center first.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 rounded-full px-3 py-1 text-[11px] uppercase tracking-widest text-zinc-500 transition hover:text-zinc-300"
        >
          ← Cancel
        </Link>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col justify-between bg-zinc-950/85 px-5 py-3.5 backdrop-blur-sm">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <Link
          href="/dashboard"
          className="rounded-full bg-zinc-900/60 px-3 py-1 uppercase tracking-widest text-zinc-300 transition hover:text-white"
        >
          ← Cancel
        </Link>
        <span>
          {userName} · attempt #{attemptNumber}
        </span>
      </div>

      <div className="mx-auto max-w-md text-center flex flex-col items-center">
        {/* Render our beautiful, high-end Gemini-generated image card */}
        <div className="my-2 h-20 w-auto overflow-hidden rounded-xl border border-zinc-800/80 shadow-md">
          <PlankIllustration variant="viewfinder" className="h-full w-auto object-cover" imageSrc="/plank-overlay.png" />
        </div>

        <h2 className="text-xl font-bold text-zinc-50">Frame your plank</h2>
        <p className="mt-1 text-xs text-zinc-300 leading-normal">
          Prop the phone perpendicular to your body. You should see your
          shoulder, hip, and ankle in the preview behind this panel.
        </p>
        <ul className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] text-zinc-400">
          <li>· Phone in landscape</li>
          <li>· Side-on to camera</li>
          <li>· Whole body in frame</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={onReady}
        className="mx-auto inline-flex h-11 w-full max-w-md items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      >
        I&apos;m ready — calibrate camera
      </button>
    </div>
  );
}

/* Desktop Sidebar Calibration Panel */
function DesktopCalibrationPanel({
  diag,
  validSeconds,
  passed,
  onStart,
}: {
  diag: EvalResult | null;
  validSeconds: number;
  passed: boolean;
  onStart: () => void;
}) {
  const percent = Math.min(100, (validSeconds / 3.0) * 100);
  
  return (
    <div className="flex flex-col gap-4 rounded-3xl bg-zinc-900/60 p-6 ring-1 ring-zinc-800/40 backdrop-blur-md">
      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
          Scoring Governance
        </span>
        <h3 className="mt-1 text-2xl font-extrabold text-zinc-100">
          Plank Calibration
        </h3>
      </div>

      <p className="text-xs leading-relaxed text-zinc-400">
        To start a verified official attempt, please get into a stable side-on plank position. Holds must clear our strict pose heuristics for 3 continuous seconds.
      </p>

      <div className="flex flex-col gap-2 rounded-2xl bg-zinc-950/40 p-4 ring-1 ring-zinc-800/40">
        <CalibrateCheck label="Camera Feed Active" checked={!!diag} />
        <CalibrateCheck label="Side-on Profile View" checked={!!diag && diag.reason !== "body_not_side_on"} />
        <CalibrateCheck label="Full Body in Frame" checked={!!diag && diag.reason !== "body_not_visible"} />
        <CalibrateCheck label="Horizontal Alignment" checked={!!diag && diag.reason !== "body_not_horizontal"} />
        <CalibrateCheck label="Suspended Elevation" checked={!!diag && diag.reason !== "body_not_elevated"} />
      </div>

      <div className="min-h-12">
        {diag ? (
          <div className={`rounded-xl px-4 py-3 text-xs font-semibold ${
            passed 
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20" 
              : diag.formValid
                ? "bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/20 animate-pulse"
                : "bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20"
          }`}>
            {passed 
              ? "✅ Calibration successful! You are ready." 
              : diag.formValid 
                ? `Hold still... ${(3.0 - validSeconds).toFixed(1)}s remaining`
                : calibrationAlertText(diag.reason)}
          </div>
        ) : (
          <div className="rounded-xl bg-zinc-950/60 px-4 py-3 text-xs text-zinc-500 text-center ring-1 ring-zinc-800/40 animate-pulse">
            Awaiting camera keypoints...
          </div>
        )}
      </div>

      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div 
          className={`h-full transition-all duration-100 ${passed ? "bg-emerald-400" : "bg-sky-400"}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!passed}
        className="mt-2 inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        Start official attempt
      </button>
    </div>
  );
}

function CalibrateCheck({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`text-[10px] ${checked ? "text-emerald-400" : "text-zinc-600"}`}>
        {checked ? "✔" : "○"}
      </span>
      <span className={checked ? "text-zinc-200" : "text-zinc-500"}>{label}</span>
    </div>
  );
}

/* Mobile Calibration Overlay */
function MobileCalibrationOverlay({
  diag,
  validSeconds,
  passed,
  onStart,
}: {
  diag: EvalResult | null;
  validSeconds: number;
  passed: boolean;
  onStart: () => void;
}) {
  const percent = Math.min(100, (validSeconds / 3.0) * 100);

  return (
    <div className="pointer-events-auto absolute inset-0 flex flex-col justify-between bg-zinc-950/80 px-5 py-4 backdrop-blur-md">
      <div className="flex items-center justify-between text-[11px] text-zinc-400">
        <Link
          href="/dashboard"
          className="rounded-full bg-zinc-900/60 px-3 py-1 uppercase tracking-widest text-zinc-300 transition hover:text-white"
        >
          ← Cancel
        </Link>
        <span>Calibration Phase</span>
      </div>

      <div className="mx-auto w-full max-w-md text-center">
        <h2 className="text-xl font-extrabold text-zinc-50 tracking-wide">
          Scoring Calibration
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Get into a side-on plank. Hold it for 3 continuous seconds.
        </p>

        <div className="mt-4 min-h-12 flex items-center justify-center">
          {diag ? (
            <div className={`w-full max-w-sm rounded-xl px-4 py-3 text-xs font-semibold ${
              passed 
                ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20" 
                : diag.formValid
                  ? "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/20 animate-pulse"
                  : "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20"
            }`}>
              {passed 
                ? "✅ Ready! Tap Start Attempt below" 
                : diag.formValid 
                  ? `Hold still... ${(3.0 - validSeconds).toFixed(1)}s remaining`
                  : calibrationAlertText(diag.reason)}
            </div>
          ) : (
            <div className="w-full max-w-sm rounded-xl bg-zinc-900/40 px-4 py-3 text-xs text-zinc-500 text-center animate-pulse">
              Locking onto body keypoints...
            </div>
          )}
        </div>

        <div className="mx-auto mt-4 h-1 w-full max-w-sm rounded-full bg-zinc-800 overflow-hidden">
          <div 
            className={`h-full transition-all duration-100 ${passed ? "bg-emerald-400" : "bg-sky-400"}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!passed}
        className="pointer-events-auto mx-auto inline-flex h-12 w-full max-w-md items-center justify-center rounded-full bg-sky-500 px-6 text-base font-semibold text-zinc-950 transition hover:bg-sky-400 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
      >
        Start official attempt
      </button>
    </div>
  );
}

function RotatePhoneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="12" y="42" width="70" height="42" rx="6" />
      <circle cx="20" cy="63" r="1.6" fill="currentColor" stroke="none" />
      <path d="M 28 26 Q 50 8, 72 26" />
      <path d="M 68 18 L 72 26 L 64 24" />
    </svg>
  );
}

function Intro({
  events,
  onStartPractice,
  onStartOfficial,
}: {
  events: Array<{ id: string; title: string; slug: string }>;
  onStartPractice: () => void;
  onStartOfficial: (eventId: string) => void;
}) {
  const [selectedEvent, setSelectedEvent] = useState("");
  const [hasConsented, setHasConsented] = useState(false);

  return (
    <section className="mt-6 sm:mt-8 max-w-5xl mx-auto">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] items-center">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-100">
            Plank qualifications portal
          </h1>
          <p className="mt-4 text-sm text-zinc-400 sm:text-base leading-relaxed">
            Qualify for the Endurance League from home. Setup your camera perpendicular to your body, complete calibration, and submit your score.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {/* Practice Mode Card */}
            <div className="flex flex-col justify-between rounded-3xl border border-zinc-800 bg-zinc-900/30 p-6 hover:border-zinc-700 transition">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Casual Training
                </span>
                <h3 className="mt-2 text-2xl font-bold text-zinc-200">Practice Mode</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Unlimited practice sessions to calibrate your camera, check your lighting, and test your endurance with live AI posture scores. Bypasses leaderboard logging.
                </p>
              </div>
              <button
                type="button"
                onClick={onStartPractice}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full border border-zinc-700 px-6 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 focus:outline-none"
              >
                Start practice run
              </button>
            </div>

            {/* Official Mode Card */}
            <div className="flex flex-col justify-between rounded-3xl border border-sky-500/20 bg-sky-500/[0.03] p-6 hover:border-sky-500/40 transition">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-sky-400">
                  League Tryouts
                </span>
                <h3 className="mt-2 text-2xl font-bold text-sky-300">Official Competition</h3>
                <p className="mt-3 text-xs leading-relaxed text-zinc-400">
                  Qualify for specific events. Employs signed attempt sessions and real-time anti-cheat browser tracking (focus losses, window blurring, frame rates).
                </p>

                <div className="mt-5">
                  <label htmlFor="event-select" className="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                    Select qualification event
                  </label>
                  <select
                    id="event-select"
                    value={selectedEvent}
                    onChange={(e) => setSelectedEvent(e.target.value)}
                    className="mt-2 w-full h-11 rounded-xl bg-zinc-950 border border-zinc-800 px-3 text-xs text-zinc-300 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">-- Choose an Event --</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mt-4 flex items-start gap-2">
                  <input
                    type="checkbox"
                    id="consent-check"
                    checked={hasConsented}
                    onChange={(e) => setHasConsented(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-zinc-700 bg-zinc-950 text-sky-500 focus:ring-sky-500 focus:ring-offset-zinc-950"
                  />
                  <label htmlFor="consent-check" className="text-[10px] text-zinc-400 leading-tight">
                    I have read and agree to the <Link href="/terms" target="_blank" className="text-sky-400 hover:underline">Terms of Competition</Link>, <Link href="/privacy" target="_blank" className="text-sky-400 hover:underline">Privacy Policy</Link>, and <Link href="/safety" target="_blank" className="text-sky-400 hover:underline">Safety Disclaimer</Link>. I confirm I am physically fit to participate.
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={() => selectedEvent && hasConsented && onStartOfficial(selectedEvent)}
                disabled={!selectedEvent || !hasConsented}
                className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-sky-500 px-6 text-sm font-semibold text-zinc-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
              >
                Start official tryout
              </button>
            </div>
          </div>
        </div>

        {/* Right side illustration card on desktop */}
        <div className="hidden lg:block relative">
          <div
            aria-hidden
            className="absolute -inset-4 -z-10 rounded-3xl bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.15),_transparent_70%)] blur-2xl"
          />
          <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/30 p-4 ring-1 ring-zinc-800/40 shadow-2xl backdrop-blur-sm">
            <PlankIllustration variant="hero" className="h-auto w-full rounded-2xl object-cover" />
          </div>
        </div>
      </div>
    </section>
  );
}

function warnTextFor(reason: PoseReason | null): string {
  switch (reason) {
    case "body_not_visible":
      return "I can't see you, adjust the camera";
    case "body_not_horizontal":
      return "Get into plank position";
    case "body_not_elevated":
      return "Lift your body off the floor";
    case "hip_angle_out_of_range":
      return "Straighten your back";
    case "body_not_side_on":
      return "Align yourself side-on to the camera";
    case "ok":
    case null:
      return "Fix your form";
  }
}

function calibrationAlertText(reason: PoseReason | null): string {
  switch (reason) {
    case "body_not_visible":
      return "📸 Position your entire body inside the frame";
    case "body_not_horizontal":
      return "🧘 Get into a horizontal plank posture";
    case "body_not_elevated":
      return "💪 Lift your hips and body suspended above floor";
    case "hip_angle_out_of_range":
      return "📏 Keep your back and hips in a straight line";
    case "body_not_side_on":
      return "🚨 Camera is front-facing! Turn 90° side-on to camera";
    default:
      return "Fix your plank posture to calibrate";
  }
}
function PortraitNudge() {
  return (
    <div className="pointer-events-auto absolute inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/95 px-6 text-center backdrop-blur-sm">
      <RotatePhoneIcon className="h-20 w-20 text-rose-400" />
      <h2 className="mt-6 text-xl font-bold text-zinc-50">
        Please rotate back to landscape
      </h2>
      <p className="mt-2 max-w-xs text-xs text-zinc-400">
        Plank posture detection and competitive scoring require a side-on landscape camera view.
      </p>
    </div>
  );
}
