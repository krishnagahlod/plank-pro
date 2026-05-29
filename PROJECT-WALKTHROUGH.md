# Plank-Pro — Project Walkthrough

*A plain-English summary of the product, what's working today, what's left to build, and where this is all heading. Written for sharing with the original idea owner.*

---

## What we're building

**Plank-Pro is the online selection round for a plank-endurance sports league.** People sign up from their browser, do a plank in front of their webcam, and an AI watches and scores how long they hold proper form. The best scores land on a public leaderboard, and an admin can shortlist candidates for the next stage of the competition.

**The point:** replace expensive, travel-heavy first-round tryouts with something anyone can do from home — while still being credible enough to identify real talent.

---

## How a participant uses it

1. **Lands on the homepage**, sees what Plank-Pro is, clicks "Register & record".
2. **Signs up** with name, email, city, password — under a minute.
3. **Lands on the recording page.** The browser asks for camera permission.
4. **Gets into a plank position** side-on to the camera.
5. **The AI watches them.** A live status pill shows what the system sees in plain English — *"Tracking plank"*, *"Lift your body"*, *"Step into frame"*, etc. When the user holds valid plank form for half a second, the timer starts.
6. **The timer counts up** while form holds. If form breaks, the timer pauses calmly — they can recover and continue.
7. **They press Stop** when done — or the system auto-stops if the pause goes on too long.
8. **A score card appears.** Combined score = duration weighted by form quality. Automatically saved to the database.
9. **Unlimited attempts.** Only their highest score is what counts.

---

## What's live today (the building blocks)

- **The website** runs in any modern browser — desktop or mobile phone. No app to install.
- **Pose detection** uses **Google's MoveNet** AI model running directly inside the browser. No video ever leaves the user's device — only the final score is sent to our server. This is fast (~30 frames/sec) and privacy-friendly.
- **Database** uses **Supabase** (free tier) to store user profiles and every attempt. A built-in rule automatically tags each user's highest score as their "best", so leaderboard logic is simple downstream.
- **Smooth, stable pose tracking.** We use the **One Euro Filter** — the same algorithm Google's MediaPipe and serious AI fitness apps use — to keep the AI's reading stable instead of jittery.
- **Multi-check plank validation.** The AI checks four things simultaneously so it can't be easily fooled:
  - Body is roughly horizontal (rejects sitting / standing)
  - Shoulder-to-ankle line is straight (rejects sagging hips)
  - Body is lifted off the floor (rejects lying flat — the trickiest case)
  - Supporting arm is in the correct position (additional safeguard against look-alike floor postures)
- **Live diagnostic panel.** Shows the user exactly what the AI sees in real time: hip angle, body tilt, elevation %, arm angle, and confidence in each tracked body part. Doubles as user feedback and self-debug.
- **Forgiving timer logic.** Short form breaks just *pause* the timer — auto-stop only triggers after 8 seconds of broken form, and only if the user has already banked at least 10 seconds of valid plank. Beginners aren't punished for setting up.
- **Clean, focused UI.** Two-column layout on laptops (camera on the left, status + live signals + Stop button on the right), uses the full screen, gracefully reflows to single-column on phones.

### Verified working end-to-end
- Registration → login → profile saved
- Recording with live pose tracking
- Score calculation (combined duration × form quality)
- Result card after each attempt
- Attempts saved, top score auto-tracked per user
- Unlimited retries, best one counts
- Clean responsive UI

---

## What's left to build (the remaining roadmap)

### Phase 4 — Public leaderboard
The public-facing rankings page. Top 100 athletes sorted by combined score. Filterable by city. Shows whether each user has been shortlisted.

**Why it matters:** social proof + competitive motivation. People share rank screenshots; that drives more sign-ups.

### Phase 5 — Admin panel
A protected page (password-gated) where an organiser can:
- See every participant ranked by best score
- Toggle "shortlisted" on each row
- Export the shortlisted list as a CSV (for inviting them to the next round)

**Why it matters:** this bridges the digital selection round to whatever happens next. Without it, the data is trapped in the database.

### Phase 6 — Polish
- Low-light warning before recording starts
- "Are you sure you want to leave?" prompt if the user navigates away mid-attempt
- Cleaner error screens, browser-specific camera-permission instructions
- Favicon, page titles, social share-card previews

### Phase 7 — Deploy
Push the site live on **Vercel** (free hosting plan that handles HTTPS — required for camera access in any browser). Test on real phones over cellular data. Wire the live URL into Supabase so authentication works end-to-end.

**After Phase 7, the product is shippable to athletes.**

Roughly speaking, the core mechanic — the hardest, most technically risky part — is done. What remains is mostly straightforward listing pages, light admin tooling, polish, and a deploy.

---

## The bigger picture — where this leads

Plank-Pro the website is the **first stage** of Plank-Pro the league. Each stage of the product directly feeds the next:

| Stage | What it adds | How the previous stage feeds it |
|---|---|---|
| **Now — Online selection** | Browser-based qualifying round | Replaces in-person tryouts entirely for round one |
| **Next — Regional qualifiers (offline)** | Shortlisted athletes do in-person planks | The admin shortlist + CSV export feeds straight into invite emails |
| **Future — Competitive league** | Real plank matches, season standings | The leaderboard concept already in place is structurally the same shape as a season table |
| **Future — Spectator product** | Live broadcast, OTT streaming, franchises | The eventual commercial ask: sponsors, viewers, sport-as-entertainment |

In other words: nothing built now will be thrown away. The selection round generates the audience and pipeline. The leaderboard becomes the standings. The admin tools become the league back-office. The user accounts become the athlete profiles for season two.

---

## Natural extensions worth flagging

These weren't in the original spec, but they're obvious low-cost adds that strengthen the funnel. Each one builds directly on something already shipped:

1. **Shareable score cards.** One-tap "Share to WhatsApp / Instagram" image showing your score and rank. Drives viral sign-ups. Small UI feature; backend already has the data.
2. **Training mode.** Practice attempts that don't save to your record, so users can warm up or calibrate their camera without burning a real attempt. Removes first-timer anxiety.
3. **Leaderboard filters.** By city, by "this week", by age group later. Makes the leaderboard interesting to people who aren't in the top 5 overall — everyone gets a leaderboard they can win.
4. **Achievement tiers.** Visual badges for the 30-second / 60-second / 2-minute / 5-minute "clubs". Costs nothing to add, gives every athlete a meaningful milestone.
5. **Real-time technique coaching.** Surface specific corrections during the attempt ("hips dropping — lift up!"). The data is already being computed every frame; this is a UI addition.
6. **Seasonal cycles.** Reset the leaderboard quarterly with a "Season X" badge. Keeps competition fresh and gives new athletes a clean shot to rank.

---

## Bigger items intentionally deferred (out-of-scope for v0.1)

These were always meant for later. Naming them so the stakeholder knows nothing has been forgotten:

- **Mobile app** (React Native) — the website works on phone browsers, but a native app has better camera and offline support
- **Video upload + server-side re-analysis** — currently the AI runs in-browser only; uploading raw video for human or stricter AI judging is a v2 capability
- **Social profiles & follows**
- **OTT streaming & broadcast integration**
- **Franchise management**
- **Payment processing** (entry fees, prize money)
- **Real-time head-to-head competition**

---

## One-paragraph TL;DR

The selection portal is roughly 70% built. The hard part — a browser-based AI that judges plank form in real time, saves scores, and gates access by login — is done. What remains before launch is a public leaderboard, an admin shortlisting page, polish, and a deploy to Vercel. After that the product is ready for the first cohort of athletes. Every piece built now feeds directly into the next stages of the league: shortlists become invites, leaderboards become season standings, athlete profiles become league registrations.
