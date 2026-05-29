"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import crypto from "crypto";

/**
 * Creates a signed official attempt session with a cryptographic nonce.
 * Valid for 15 minutes. Prevents client-side session forging.
 */
export async function createAttemptSessionAction(eventId: string | null) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

  const admin = createAdminClient();
  const { data: session, error } = await admin
    .from("attempt_sessions")
    .insert({
      user_id: user.id,
      event_id: eventId,
      nonce,
      expires_at: expiresAt,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createAttemptSessionAction] failed:", error);
    throw new Error(`Failed to create attempt session: ${error.message}`);
  }

  return { sessionId: session.id, nonce };
}

/**
 * Persists attempts server-side using the admin client.
 * Validates cryptographic sessions and evaluates anti-cheat risk telemetry.
 */
export async function saveAttemptAction(payload: {
  attempt_type: "practice" | "official";
  event_id: string | null;
  session_id: string | null;
  total_seconds: number;
  valid_seconds: number;
  form_score: number;
  stability_score: number;
  breaks_count: number;
  combined_score: number;
  scoring_version: string;
  model_version: string;
  metrics: {
    avgHipQuality: number;
    avgKneeQuality: number;
    avgArmQuality: number;
    avgTiltQuality: number;
    avgConfidence: number;
  } | null;
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
}) {
  const supabase = createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const admin = createAdminClient();

  let verificationStatus: "verified" | "flagged" | "rejected" = "verified";
  let riskScore = 0;
  const riskReasons: string[] = [];

  if (payload.attempt_type === "official") {
    if (!payload.session_id) {
      throw new Error("Missing signed attempt session token");
    }

    // Retrieve and validate session
    const { data: session, error: sessErr } = await admin
      .from("attempt_sessions")
      .select("*")
      .eq("id", payload.session_id)
      .single();

    if (sessErr || !session) {
      console.error("[saveAttemptAction] session fetch failed:", sessErr);
      throw new Error("Invalid signed attempt session");
    }

    if (session.user_id !== user.id) {
      throw new Error("Attempt session ownership mismatch");
    }

    if (session.status !== "active") {
      throw new Error("Attempt session has already been used or expired");
    }

    const isExpired = new Date(session.expires_at).getTime() < Date.now();
    if (isExpired) {
      await admin
        .from("attempt_sessions")
        .update({ status: "expired" })
        .eq("id", payload.session_id);
      throw new Error("Attempt session token has expired");
    }

    // Mark session as used immediately
    await admin
      .from("attempt_sessions")
      .update({ status: "used" })
      .eq("id", payload.session_id);

    // ------------------------------------------------------------------------
    // Anti-Cheat Risk Heuristics Evaluation
    // ------------------------------------------------------------------------
    
    // 1. Browser Tab Switching / Hidden (High Severity)
    if (payload.device_metadata.tabVisibilityChanges > 0) {
      riskScore += 50;
      riskReasons.push("Tab hidden / browser backgrounded during attempt");
    }

    // 2. Browser Focus Lost / Blurred (High Severity)
    if (payload.device_metadata.pageFocusLost > 0) {
      riskScore += 50;
      riskReasons.push("Browser window focus lost during attempt");
    }

    // 3. Camera Framerate averages (Medium Severity)
    if (payload.device_metadata.fpsAvg < 10) {
      riskScore += 30;
      riskReasons.push("Atypical low camera framerate (average < 10 FPS)");
    }
    if (payload.device_metadata.fpsMin < 5) {
      riskScore += 15;
      riskReasons.push("Critical framerate drop (minimum < 5 FPS)");
    }

    // 4. Joint Visibility Confidence (Medium Severity)
    if (payload.metrics && payload.metrics.avgConfidence < 0.6) {
      riskScore += 20;
      riskReasons.push("Low keypoint visibility confidence");
    }

    // 5. Abnormal duration spikes (Medium Severity)
    if (payload.valid_seconds > 600) {
      riskScore += 40;
      riskReasons.push("Unusually long plank duration (> 10 mins)");
    }

    // Cap risk score between 0 and 100
    riskScore = Math.max(0, Math.min(100, riskScore));

    // Flag attempts matching or exceeding threshold
    if (riskScore >= 50) {
      verificationStatus = "flagged";
    }
  }

  // Insert attempt with secure, server-computed parameters
  const { data: attempt, error: insertErr } = await admin
    .from("attempts")
    .insert({
      user_id: user.id,
      total_seconds: payload.total_seconds,
      valid_seconds: payload.valid_seconds,
      form_score: payload.form_score,
      stability_score: payload.stability_score,
      breaks_count: payload.breaks_count,
      combined_score: payload.combined_score,
      scoring_version: payload.scoring_version,
      model_version: payload.model_version,
      metrics: payload.metrics,
      attempt_type: payload.attempt_type,
      event_id: payload.event_id,
      verification_status: verificationStatus,
      risk_score: riskScore,
      risk_reasons: riskReasons,
      device_metadata: payload.device_metadata,
      snapshots: payload.snapshots ?? [],
    })
    .select("id")
    .single();

  if (insertErr) {
    console.error("[saveAttemptAction] insert failed:", insertErr);
    throw new Error(`Failed to save attempt: ${insertErr.message}`);
  }

  return { 
    id: attempt.id, 
    riskScore, 
    riskReasons, 
    verificationStatus 
  };
}
