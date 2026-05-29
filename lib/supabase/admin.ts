import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
} from "@/lib/env.server";

/**
 * Service-role Supabase client. Bypasses Row Level Security — only use it
 * server-side, inside admin-gated routes. Never import this from a client
 * component.
 */
export function createAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
