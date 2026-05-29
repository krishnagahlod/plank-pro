// Shared environment variables — validated once at import time.
// If a required var is missing, the process throws immediately with
// a human-readable message instead of cryptic Supabase errors later.
//
// This module is safe to import from both client and server components
// because it only references NEXT_PUBLIC_* vars.

/** Supabase project URL (public, used client + server). */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
if (!SUPABASE_URL) {
  throw new Error(
    `❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL\n` +
      `   → Copy .env.local.example to .env.local and fill in all values.`,
  );
}

/** Supabase anonymous key (public, used client + server). */
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
if (!SUPABASE_ANON_KEY) {
  throw new Error(
    `❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY\n` +
      `   → Copy .env.local.example to .env.local and fill in all values.`,
  );
}
