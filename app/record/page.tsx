import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RecordingClient from "./RecordingClient";

export const dynamic = "force-dynamic";

export default async function RecordPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/record");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/register?next=/record");
  }

  const { count } = await supabase
    .from("attempts")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const previousAttempts = count ?? 0;

  // Query all active and published events
  const { data: events } = await supabase
    .from("events")
    .select("id, title, slug")
    .eq("is_published", true)
    .order("starts_at", { ascending: false });

  return (
    <RecordingClient
      userName={profile.full_name}
      attemptNumber={previousAttempts + 1}
      events={events ?? []}
    />
  );
}
