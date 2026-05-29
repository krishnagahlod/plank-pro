"use client";

import { useEffect, useRef, useState } from "react";
import { getDetector, type Keypoint } from "@/lib/pose/detector";
import {
  evaluatePose,
  type EvalResult,
  type PoseReason,
} from "@/lib/pose/plankState";
import { KeypointSmoother } from "@/lib/pose/smoothing";
import type * as poseDetection from "@tensorflow-models/pose-detection";

type Props = {
  onPose: (keypoints: Keypoint[], dtMs: number) => void;
  onEval?: (evalResult: EvalResult) => void;
  paused?: boolean;
  onReady?: () => void;
  getSnapshotRef?: React.MutableRefObject<(() => string | null) | null>;
};

type Status = "init" | "ready" | "error";

const SKELETON_EDGES: ReadonlyArray<readonly [number, number]> = [
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
];

export default function PoseCamera({
  onPose,
  onEval,
  paused,
  onReady,
  getSnapshotRef,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onPoseRef = useRef(onPose);
  const onEvalRef = useRef(onEval);
  const onReadyRef = useRef(onReady);
  const pausedRef = useRef(paused ?? false);
  const [status, setStatus] = useState<Status>("init");
  const [errorMsg, setErrorMsg] = useState("");
  const [fps, setFps] = useState(0);
  const [statusReason, setStatusReason] = useState<PoseReason | null>(null);
  const [lightingLow, setLightingLow] = useState(false);

  useEffect(() => {
    onPoseRef.current = onPose;
  });

  useEffect(() => {
    onEvalRef.current = onEval;
  });

  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    pausedRef.current = paused ?? false;
  }, [paused]);

  useEffect(() => {
    if (getSnapshotRef) {
      getSnapshotRef.current = () => {
        const video = videoRef.current;
        if (!video || video.readyState < 2) return null;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = 320;
          canvas.height = 180;
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          // Flip horizontal to match mirrored screen display
          ctx.translate(320, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, 320, 180);
          return canvas.toDataURL("image/jpeg", 0.6);
        } catch (e) {
          console.error("[PoseCamera] Failed to capture snapshot:", e);
          return null;
        }
      };
    }
    return () => {
      if (getSnapshotRef) getSnapshotRef.current = null;
    };
  }, [getSnapshotRef]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detector: poseDetection.PoseDetector | null = null;
    let rafId = 0;
    let cancelled = false;
    let lightingTimer: number | null = null;
    const smoother = new KeypointSmoother();

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        video.srcObject = stream;
        await video.play();

        detector = await getDetector();
        if (cancelled) return;

        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setErrorMsg("Could not initialise canvas context.");
          setStatus("error");
          return;
        }

        setStatus("ready");
        onReadyRef.current?.();

        // One-shot lighting check ~0.5 s after the stream is live, so the
        // sensor has had a chance to auto-exposure. Threshold 70/255 is the
        // rough boundary where MoveNet starts losing far-side keypoints.
        lightingTimer = window.setTimeout(() => {
          if (cancelled) return;
          const sampleCanvas = document.createElement("canvas");
          sampleCanvas.width = 80;
          sampleCanvas.height = 60;
          const sampleCtx = sampleCanvas.getContext("2d");
          if (!sampleCtx) return;
          sampleCtx.drawImage(video, 0, 0, 80, 60);
          try {
            const px = sampleCtx.getImageData(0, 0, 80, 60).data;
            let sum = 0;
            const pixelCount = px.length / 4;
            for (let i = 0; i < px.length; i += 4) {
              sum += 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
            }
            const meanLuma = sum / pixelCount;
            if (meanLuma < 70) setLightingLow(true);
          } catch {
            // getImageData can throw on tainted streams (rare for webcam).
          }
        }, 500);

        let lastTimestamp = performance.now();
        let fpsTimestamp = lastTimestamp;
        let frameCount = 0;
        let lastDiagUpdate = 0;

        const loop = async () => {
          if (cancelled) return;
          const now = performance.now();
          const dtMs = now - lastTimestamp;
          lastTimestamp = now;

          frameCount += 1;
          if (now - fpsTimestamp >= 1000) {
            setFps(Math.round((frameCount * 1000) / (now - fpsTimestamp)));
            frameCount = 0;
            fpsTimestamp = now;
          }

          try {
            const poses = detector
              ? await detector.estimatePoses(video, {
                  maxPoses: 1,
                  flipHorizontal: false,
                })
              : [];
            const rawKps = poses[0]?.keypoints;
            if (rawKps) {
              // One Euro Filter per keypoint: heavy smoothing while still,
              // light smoothing during intentional motion. Everything downstream
              // (drawing, state machine, live signals) sees the same smoothed
              // data, so the UI never disagrees with itself.
              const kps = smoother.push(rawKps, now);
              drawSkeleton(ctx, kps, canvas.width, canvas.height);
              if (!pausedRef.current) {
                onPoseRef.current(kps, dtMs);
              }
              // Throttle diagnostic updates to 5 Hz to keep React re-renders cheap.
              if (now - lastDiagUpdate > 200) {
                lastDiagUpdate = now;
                const evalResult = evaluatePose(kps);
                setStatusReason(evalResult.reason);
                onEvalRef.current?.(evalResult);
              }
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              smoother.reset();
            }
          } catch (err) {
            console.error("[PoseCamera] estimatePoses failed:", err);
          }

          rafId = requestAnimationFrame(loop);
        };
        rafId = requestAnimationFrame(loop);
      } catch (err) {
        const e = err as DOMException;
        const name = e?.name ?? "Error";
        if (name === "NotAllowedError" || name === "SecurityError") {
          setErrorMsg(
            "Camera permission was denied. Open your browser's site settings, allow camera access for this page, then refresh.",
          );
        } else if (name === "NotFoundError" || name === "OverconstrainedError") {
          setErrorMsg(
            "No webcam was detected. Connect a camera or switch to a device with one.",
          );
        } else if (name === "NotReadableError") {
          setErrorMsg(
            "Camera is being used by another app. Close other video apps and refresh.",
          );
        } else {
          setErrorMsg(`Camera error: ${e?.message ?? String(err)}`);
        }
        setStatus("error");
      }
    };

    init();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      if (lightingTimer !== null) clearTimeout(lightingTimer);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-zinc-900 ring-1 ring-zinc-800 lg:rounded-2xl">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)]"
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full [transform:scaleX(-1)]"
      />
      {status === "init" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-zinc-950/70 text-sm text-zinc-200">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-500 border-t-sky-400" />
          <span>Loading camera and pose model…</span>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/85 p-6 text-center">
          <span className="text-base font-semibold text-rose-400">
            Can&apos;t access camera
          </span>
          <span className="max-w-sm text-sm text-zinc-300">{errorMsg}</span>
        </div>
      )}
      {status === "ready" && <StatusPill reason={statusReason} />}
      {status === "ready" && lightingLow && (
        <button
          type="button"
          onClick={() => setLightingLow(false)}
          className="absolute right-2 top-14 inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 px-3 py-1 text-[11px] font-semibold text-zinc-950 backdrop-blur transition hover:bg-amber-400 lg:top-2"
          title="Dismiss"
        >
          <span aria-hidden>💡</span>
          <span>Lighting looks dim — tracker may struggle</span>
          <span aria-hidden className="ml-1 opacity-70">
            ✕
          </span>
        </button>
      )}
      {status === "ready" && (
        <div className="absolute bottom-36 right-2 rounded-full bg-zinc-950/70 px-2 py-1 text-[10px] font-medium tabular-nums text-zinc-300 lg:bottom-2">
          {fps} fps
        </div>
      )}
    </div>
  );
}

function StatusPill({ reason }: { reason: PoseReason | null }) {
  const { label, dot, ring, text } = pillTheme(reason);
  return (
    <div
      className={`absolute left-2 top-14 inline-flex items-center gap-2 rounded-full bg-zinc-950/80 px-3 py-1 backdrop-blur lg:top-2 ${ring}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span className={`text-[11px] font-semibold ${text}`}>{label}</span>
    </div>
  );
}

function pillTheme(reason: PoseReason | null) {
  switch (reason) {
    case "ok":
      return {
        label: "Tracking plank",
        dot: "bg-emerald-400",
        ring: "ring-1 ring-emerald-500/40",
        text: "text-emerald-200",
      };
    case "body_not_horizontal":
      return {
        label: "Not horizontal",
        dot: "bg-amber-400",
        ring: "ring-1 ring-amber-500/40",
        text: "text-amber-200",
      };
    case "body_not_elevated":
      return {
        label: "Lift your body",
        dot: "bg-amber-400",
        ring: "ring-1 ring-amber-500/40",
        text: "text-amber-200",
      };
    case "hip_angle_out_of_range":
      return {
        label: "Straighten back",
        dot: "bg-amber-400",
        ring: "ring-1 ring-amber-500/40",
        text: "text-amber-200",
      };
    case "body_not_visible":
    case null:
      return {
        label: "Step into frame",
        dot: "bg-zinc-400",
        ring: "ring-1 ring-zinc-700",
        text: "text-zinc-200",
      };
    case "body_not_side_on":
      return {
        label: "Turn side-on",
        dot: "bg-rose-400",
        ring: "ring-1 ring-rose-500/40",
        text: "text-rose-200",
      };
  }
}

function drawSkeleton(
  ctx: CanvasRenderingContext2D,
  kps: Keypoint[],
  width: number,
  height: number,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 3;
  for (const [a, b] of SKELETON_EDGES) {
    const ka = kps[a];
    const kb = kps[b];
    if (!ka || !kb) continue;
    if ((ka.score ?? 0) < 0.4 || (kb.score ?? 0) < 0.4) continue;
    ctx.beginPath();
    ctx.moveTo(ka.x, ka.y);
    ctx.lineTo(kb.x, kb.y);
    ctx.stroke();
  }
  ctx.fillStyle = "#38bdf8";
  for (const k of kps) {
    if ((k.score ?? 0) < 0.4) continue;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
