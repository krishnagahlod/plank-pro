# Plank-Pro — Selection Portal v0.1
> Drop this file in the root of your Next.js project as `CLAUDE.md`. Claude Code reads it automatically as project context.

---

## What we are building

A web application where participants record a live plank attempt through their browser webcam. An AI pose detection model scores their form and duration in real time. The best score per user appears on a public leaderboard. An admin can shortlist candidates for the next stage of the competition.

This is the online selection round for Plank-Pro, a plank-based endurance sports league being built as a new-age spectator sport.

---

## Tech stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | File-based routing, server components, API routes in one repo |
| Database + Auth | Supabase | PostgreSQL, email auth, RLS, Realtime — free tier covers pilot |
| Pose detection | TensorFlow.js + MoveNet Lightning | 50fps+ on mid-range devices, 17 landmarks sufficient for plank, simpler JS integration than MediaPipe |
| Deployment | Vercel | Next.js native, free tier, HTTPS out of the box (required for getUserMedia) |
| Styling | Tailwind CSS | Rapid UI, no context switching |

**Key packages:**
```
@tensorflow/tfjs
@tensorflow-models/pose-detection
@supabase/supabase-js
@supabase/ssr
```

---

## Project structure

```
plank-pro/
├── CLAUDE.md                     ← this file
├── app/
│   ├── page.tsx                  ← landing page
│   ├── register/page.tsx         ← registration form
│   ├── record/page.tsx           ← live plank recording screen
│   ├── result/page.tsx           ← post-attempt score card
│   ├── leaderboard/page.tsx      ← public leaderboard
│   └── admin/
│       ├── layout.tsx            ← auth middleware check
│       └── page.tsx              ← shortlist management
├── components/
│   ├── PoseCamera.tsx            ← webcam + MoveNet + canvas overlay
│   ├── PlankTimer.tsx            ← timer logic, form state machine
│   ├── FormIndicator.tsx         ← green/amber/red feedback bar
│   └── LeaderboardTable.tsx      ← sortable, filterable table
├── lib/
│   ├── supabase/
│   │   ├── client.ts             ← browser client
│   │   └── server.ts             ← server component client
│   ├── pose/
│   │   ├── detector.ts           ← MoveNet init and detection loop
│   │   ├── angles.ts             ← landmark → angle calculations
│   │   └── scoring.ts            ← scoring formula
│   └── constants.ts              ← thresholds, config
├── middleware.ts                 ← Supabase session refresh
└── types/
    └── index.ts                  ← shared TypeScript types
```

---

## Database schema (Supabase / PostgreSQL)

Run these in the Supabase SQL editor in order.

```sql
-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  college text not null,
  city text not null,
  phone text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "Users can read own profile" on profiles for select using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Attempts
create table attempts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  total_seconds numeric not null,
  valid_seconds numeric not null,
  form_score numeric not null check (form_score >= 0 and form_score <= 100),
  combined_score numeric not null,
  is_best boolean default false,
  created_at timestamptz default now()
);

alter table attempts enable row level security;
create policy "Users can read all attempts" on attempts for select using (true);
create policy "Users can insert own attempts" on attempts for insert with check (auth.uid() = user_id);

-- Auto-update is_best after each insert
create or replace function update_best_attempt()
returns trigger as $$
begin
  update attempts set is_best = false
  where user_id = new.user_id and id != new.id;
  update attempts set is_best = true
  where id = (
    select id from attempts
    where user_id = new.user_id
    order by combined_score desc
    limit 1
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger after_attempt_insert
after insert on attempts
for each row execute procedure update_best_attempt();

-- Shortlist
create table shortlist (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade unique,
  stage text default 'regional_qualifier',
  notes text,
  shortlisted_at timestamptz default now()
);

-- Leaderboard view (convenience)
create view leaderboard as
  select
    p.full_name,
    p.college,
    p.city,
    a.valid_seconds,
    a.form_score,
    a.combined_score,
    a.created_at,
    exists(select 1 from shortlist s where s.user_id = p.id) as is_shortlisted
  from attempts a
  join profiles p on p.id = a.user_id
  where a.is_best = true
  order by a.combined_score desc;
```

---

## Pose detection and scoring

### MoveNet landmark indices used

```
5  = left shoulder
6  = right shoulder
11 = left hip
12 = right hip
15 = left ankle
16 = right ankle
```

### Angle calculation

```typescript
// lib/pose/angles.ts
export function getAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },   // vertex
  c: { x: number; y: number }
): number {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x**2 + ab.y**2) * Math.sqrt(cb.x**2 + cb.y**2);
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}
```

The plank hip angle is calculated at landmark 11 (left hip) using points: left shoulder → left hip → left ankle.

### Form thresholds

```typescript
// lib/constants.ts
export const FORM = {
  VALID_MIN: 155,       // degrees — hip angle lower bound
  VALID_MAX: 200,       // degrees — hip angle upper bound (slight hyperextension ok)
  WARN_MIN: 145,        // degrees — warning zone starts
  DQ_HOLD_SECONDS: 3,   // seconds of continuous violation before disqualification
  MIN_CONFIDENCE: 0.4,  // MoveNet keypoint score threshold
  TARGET_FPS: 30,
} as const;
```

### Scoring formula

```
valid_seconds   = total frames where form is valid / fps
form_score      = (valid_seconds / total_seconds) × 100
combined_score  = valid_seconds × √(form_score / 100)
```

This formula rewards duration but penalises poor form. A 3-minute hold at 100% form scores higher than a 4-minute hold at 50% form.

### Form state machine

```
IDLE → READY (user clicks start)
READY → IN_PLANK (first valid frame detected)
IN_PLANK → WARNING (hip angle outside valid range)
WARNING → IN_PLANK (form corrected within DQ_HOLD_SECONDS)
WARNING → DISQUALIFIED (violation held for DQ_HOLD_SECONDS)
IN_PLANK or WARNING → COMPLETED (user clicks stop)
```

---

## Core component behaviour

### PoseCamera.tsx

Responsibilities:
- Request webcam via `navigator.mediaDevices.getUserMedia`
- Load MoveNet Lightning model once on mount
- Run detection loop using `requestAnimationFrame`
- Draw skeleton overlay on canvas element
- Emit pose data upward via callback prop `onPose(keypoints)`
- Handle permission denied and low-confidence gracefully

### PlankTimer.tsx

Responsibilities:
- Consume pose data from PoseCamera
- Maintain form state machine (see above)
- Track `totalSeconds`, `validSeconds`, `violationStreak`
- Trigger DQ after `FORM.DQ_HOLD_SECONDS` of continuous violation
- On session end (stop or DQ), emit `{ totalSeconds, validSeconds, formScore, combinedScore }`

### Attempt limits

Before showing the record screen, check:

```typescript
const { count } = await supabase
  .from('attempts')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', user.id);

if (count >= 3) redirect('/leaderboard?msg=max_attempts');
```

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=       # server only — admin operations
ADMIN_PASSWORD=                  # plain string — for /admin route protection
```

---

## Admin panel

Route: `/admin` — protected by middleware checking `ADMIN_PASSWORD` cookie.

Features needed:
- Table of all profiles with their best `combined_score`, `valid_seconds`, `form_score`
- Toggle shortlist status (inserts or deletes from `shortlist` table)
- Export shortlisted candidates as CSV (client-side, no API needed)
- Filter by college and city

No auth library needed — simple cookie check in `middleware.ts` is sufficient for v0.1.

---

## Out of scope for v0.1

Do not build or suggest any of the following until after the pilot:

- Video upload and server-side analysis
- Social profiles or follows
- OTT streaming or broadcast integration
- Franchise management
- Mobile app (React Native)
- Payment processing
- Gamification badges
- Real-time head-to-head competition

---

## Known edge cases to handle

| Case | Handling |
|---|---|
| Camera permission denied | Show a clear error screen with browser-specific instructions |
| iOS Safari camera | Requires HTTPS and user gesture — Vercel handles HTTPS, ensure button click triggers stream |
| Low lighting | Calculate average frame brightness, show warning if below threshold before recording starts |
| User leaves mid-plank | `beforeunload` listener — prompt to save or discard current attempt |
| MoveNet model not loaded | Show loading state, do not allow record to start until model is ready |
| Supabase insert fails | Show error and allow retry — do not lose score data client-side |

---

## Coding conventions

- All components in TypeScript with explicit prop types
- Supabase calls only in server components or API routes — not raw in client components
- No `any` types
- Loading and error states required for every async operation
- Mobile-first Tailwind — design for 375px width upward
