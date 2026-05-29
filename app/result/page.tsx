import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ResultClient from "./ResultClient";

export const dynamic = "force-dynamic";

export default async function ResultPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/result");
  }

  return <ResultClient />;
}
