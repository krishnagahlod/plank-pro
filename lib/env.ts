// Shared environment variables — validated once at import time.
// If a required var is missing, the process throws immediately with
// a human-readable message instead of cryptic Supabase errors later.
//
// This module is safe to import from both client and server components
// because it only references NEXT_PUBLIC_* vars.

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

/** Supabase project URL (public, used client + server). */
export const SUPABASE_URL = required("NEXT_PUBLIC_SUPABASE_URL");

/** Supabase anonymous key (public, used client + server). */
export const SUPABASE_ANON_KEY = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
