"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

type EventValues = {
  slug: string;
  title: string;
  summary: string;
  description: string | null;
  mode: "online" | "offline";
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  registration_url: string | null;
  cover_image_url: string | null;
  is_published: boolean;
};

function extractEventValues(formData: FormData): EventValues | { error: string } {
  const slug = (formData.get("slug")?.toString() ?? "").trim();
  const title = (formData.get("title")?.toString() ?? "").trim();
  const summary = (formData.get("summary")?.toString() ?? "").trim();
  const description = formData.get("description")?.toString().trim() || null;
  const modeRaw = formData.get("mode")?.toString() ?? "";
  const location = formData.get("location")?.toString().trim() || null;
  const startsAtRaw = formData.get("starts_at")?.toString() ?? "";
  const endsAtRaw = formData.get("ends_at")?.toString() ?? "";
  const registrationUrl =
    formData.get("registration_url")?.toString().trim() || null;
  const coverImageUrl =
    formData.get("cover_image_url")?.toString().trim() || null;
  const isPublished = formData.get("is_published") === "on";

  if (!slug) return { error: "Slug is required." };
  if (!title) return { error: "Title is required." };
  if (!summary) return { error: "Summary is required." };
  if (modeRaw !== "online" && modeRaw !== "offline")
    return { error: "Mode must be online or offline." };
  if (!startsAtRaw) return { error: "Start date is required." };

  return {
    slug,
    title,
    summary,
    description,
    mode: modeRaw,
    location,
    starts_at: new Date(startsAtRaw).toISOString(),
    ends_at: endsAtRaw ? new Date(endsAtRaw).toISOString() : null,
    registration_url: registrationUrl,
    cover_image_url: coverImageUrl,
    is_published: isPublished,
  };
}

function revalidateBoth() {
  revalidatePath("/admin/events");
  revalidatePath("/events");
}

export async function createEvent(formData: FormData) {
  const parsed = extractEventValues(formData);
  if ("error" in parsed) {
    redirect(`/admin/events/new?error=${encodeURIComponent(parsed.error)}`);
  }
  const admin = createAdminClient();
  const { error } = await admin.from("events").insert(parsed);
  if (error) {
    redirect(`/admin/events/new?error=${encodeURIComponent(error.message)}`);
  }
  revalidateBoth();
  redirect("/admin/events");
}

export async function updateEvent(id: string, formData: FormData) {
  const parsed = extractEventValues(formData);
  if ("error" in parsed) {
    redirect(
      `/admin/events/${id}/edit?error=${encodeURIComponent(parsed.error)}`,
    );
  }
  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    redirect(
      `/admin/events/${id}/edit?error=${encodeURIComponent(error.message)}`,
    );
  }
  revalidateBoth();
  redirect("/admin/events");
}

export async function deleteEvent(id: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBoth();
}

export async function togglePublished(id: string, currentlyPublished: boolean) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({
      is_published: !currentlyPublished,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidateBoth();
}
