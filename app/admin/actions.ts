"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

const COOKIE_NAME = "pp_admin";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 1 week

export async function login(formData: FormData) {
  const password = formData.get("password")?.toString() ?? "";
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    redirect("/admin/login?error=missing_env");
  }
  if (password !== expected) {
    redirect("/admin/login?error=wrong_password");
  }

  cookies().set(COOKIE_NAME, password, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_MAX_AGE,
  });

  redirect("/admin");
}

export async function logout() {
  cookies().delete(COOKIE_NAME);
  redirect("/admin/login");
}

async function verifyAdminAuth() {
  const adminCookie = cookies().get(COOKIE_NAME)?.value;
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || adminCookie !== expected) {
    throw new Error("Unauthorized: Admin authentication required");
  }
}

async function logAudit(action: string, targetId: string | null, details: Record<string, unknown> = {}) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    action,
    target_id: targetId,
    details,
  });
}

export async function setShortlisted(userId: string, shortlisted: boolean) {
  await verifyAdminAuth();
  const admin = createAdminClient();
  if (shortlisted) {
    // Upsert is safer than insert in case of race / duplicate clicks.
    const { error } = await admin
      .from("shortlist")
      .upsert({ user_id: userId }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from("shortlist")
      .delete()
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
  }
  
  await logAudit(shortlisted ? "shortlist_add" : "shortlist_remove", userId);
  revalidatePath("/admin");
}

export async function reviewAttemptAction(
  attemptId: string,
  status: "verified" | "rejected" | "flagged",
  notes: string
) {
  await verifyAdminAuth();
  const admin = createAdminClient();
  
  const { error } = await admin
    .from("attempts")
    .update({
      verification_status: status,
      review_notes: notes,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", attemptId);

  if (error) {
    console.error("[reviewAttemptAction] failed:", error);
    throw new Error(`Failed to update attempt review: ${error.message}`);
  }

  await logAudit(`review_attempt_${status}`, attemptId, { notes });

  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
}
