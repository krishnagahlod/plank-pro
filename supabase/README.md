# Supabase setup — Plank-Pro selection portal

Follow these steps once to get the database ready. Total time: ~10 minutes.

## 1. Create a free Supabase project

1. Go to https://supabase.com/dashboard and sign in (GitHub is fastest)
2. Click **New project**
   - **Name:** `plank-pro` (or whatever)
   - **Region:** pick the one geographically closest to where most athletes will be
   - **Database password:** generate a strong one and save it somewhere safe (you won't need it for the app, but keep it for emergencies)
3. Wait ~2 minutes for the project to provision

## 2. Run the schema

1. In the Supabase dashboard, open **SQL Editor** (left sidebar)
2. Click **New query**
3. Open [schema.sql](./schema.sql) from this folder, paste its full contents into the editor
4. Click **Run** (Ctrl/Cmd + Enter)
5. You should see "Success. No rows returned" — that's the expected output

Verify in **Table Editor** (left sidebar) that you can see:
- `profiles`
- `attempts`
- `shortlist`

And in **Database → Views**, you should see:
- `leaderboard`

## 3. Enable email + password auth

1. Open **Authentication → Providers** (left sidebar)
2. Find **Email** in the list and click it
3. Make sure:
   - **Enable Email Provider** = ON
   - **Confirm email** = OFF (for v0.1 — keeps registration friction low; flip to ON if you ever want email verification)
4. Click **Save**

## 4. Copy credentials into `.env.local`

1. Open **Settings → API** (left sidebar, gear icon at the bottom)
2. Copy these three values:

| Supabase field | Goes into `.env.local` as |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** key (click "Reveal") | `SUPABASE_SERVICE_ROLE_KEY` |

Then in the project root:

```bash
cp .env.local.example .env.local
# edit .env.local and paste the three values above
# also set ADMIN_PASSWORD to any string of your choice — that's the password for the /admin panel
```

⚠️ **Never commit `.env.local`.** The `service_role` key bypasses Row Level Security; if it leaks, anyone can read/write any row.

## 5. Sanity-check

From the project root:

```bash
pnpm dev
```

The dev server should start on `http://localhost:3000` with no environment-variable warnings.

You're done with Phase 1. The DB is ready for Phase 3 (registration + attempt persistence) to wire into.
