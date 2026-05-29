import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Inline env validation for the Edge runtime (middleware cannot reliably
// use the @/ path alias or the shared lib/env module).
function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `❌ Missing required environment variable: ${name}\n` +
        `   → Copy .env.local.example to .env.local and fill in all values.`,
    );
  }
  return value;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin gate: every /admin/* page except the login itself requires the
  // pp_admin cookie to match ADMIN_PASSWORD.
  if (pathname.startsWith("/admin") && !pathname.startsWith("/admin/login")) {
    const adminCookie = request.cookies.get("pp_admin")?.value;
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected || adminCookie !== expected) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.search = "";
      return NextResponse.redirect(loginUrl);
    }
  }

  let response = NextResponse.next({ request });

  const supabaseUrl = requiredEnv("NEXT_PUBLIC_SUPABASE_URL");
  const supabaseAnonKey = requiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
