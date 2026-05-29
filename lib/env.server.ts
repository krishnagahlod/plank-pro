// Server-only environment variables — must NEVER be imported from a client
// component. Re-exports the public vars for convenience so server code only
// needs one import.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./env";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n` +
        `   → Copy .env.local.example to .env.local and fill in all values.`,
    );
  }
  return value;
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };

/** Supabase service-role key — bypasses RLS. Server-only. */
export const SUPABASE_SERVICE_ROLE_KEY = required("SUPABASE_SERVICE_ROLE_KEY");

/** Shared admin password for the MVP admin gate. Server-only. */
export const ADMIN_PASSWORD = required("ADMIN_PASSWORD");
