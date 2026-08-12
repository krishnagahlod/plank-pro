# Plank-Pro Architecture & Technical Details

## 1. Project Overview
**Plank-Pro** is a web-based, AI-powered selection portal for a plank endurance sports league. Users record a live plank attempt through their browser webcam. An AI pose detection model scores their form and duration in real time. The best scores appear on a public leaderboard, and admins can shortlist candidates for the next stage of the competition. 

The primary goal is to replace expensive, in-person tryouts with an accessible, credible at-home solution.

## 2. Technical Architecture

### 2.1 Tech Stack
- **Framework**: Next.js 14 (App Router). Used for both server-rendered pages and client-side camera/AI logic.
- **Database & Authentication**: Supabase (PostgreSQL). Utilizes Row Level Security (RLS) and database triggers to maintain data integrity (e.g., auto-flagging a user's best attempt).
- **Pose Detection**: TensorFlow.js with the **MoveNet Lightning** model. Runs entirely client-side (in-browser) for zero latency and maximum privacy. 
- **Deployment**: Vercel (Edge network, automated CI/CD, required HTTPS for webcam API access).
- **Styling**: Tailwind CSS.

### 2.2 System Components
1. **Client-Side AI Engine (`PoseCamera.tsx` & `lib/pose/`)**: 
   - Uses `navigator.mediaDevices.getUserMedia` to access the webcam.
   - Runs MoveNet Lightning via `requestAnimationFrame` for high frame-rate (~30 FPS) inference.
   - Applies the **One Euro Filter** to smooth keypoint coordinates and prevent jittery angles.
2. **Scoring State Machine (`PlankTimer.tsx` & `plankState.ts`)**: 
   - Processes the raw keypoints into geometric angles (hip, knee, arm).
   - Manages state transitions: `READY` → `IN_PLANK` → `WARNING` → `DISQUALIFIED` / `COMPLETED`.
   - Emits the final `formScore` and `validSeconds`.
3. **Database Layer (Supabase)**: 
   - `profiles`: User information.
   - `attempts`: Stores all planks. A Postgres trigger automatically updates `is_best` so the leaderboard query remains fast.
   - `shortlist`: Admin-controlled table for advancing athletes to regional qualifiers.

## 3. Design Decisions & Tradeoffs

### 3.1 Client-Side vs Server-Side Inference
- **Decision**: Run the MoveNet AI model entirely in the browser using TensorFlow.js.
- **Tradeoff**: We trade the ability to use massive, heavy state-of-the-art models for zero-latency feedback, zero server compute costs, and absolute user privacy (video never leaves the device).

### 3.2 Forgiving Calibration vs Strict Calibration
- **Decision**: Replaced strict pre-recording calibration (which originally required full-body visibility and perfect side-on alignment) with a seamless 5-second countdown timer.
- **Tradeoff**: Users in small rooms or constrained environments no longer get stuck trying to frame their ankles perfectly. However, the AI must now be resilient to incomplete body data.

### 3.3 Dynamic Fallback Pose Evaluation
- **Decision**: In `evaluatePose`, if the ankle keypoints are missing or low confidence, the engine dynamically falls back to using the knee keypoints for calculating body length and tilt.
- **Tradeoff**: We lose some accuracy in determining the exact lower-leg angle, but we vastly improve UX for athletes in small rooms. To counter the risk of cheating (e.g. users resting their knees on the ground), we introduced a strict geometric check (`kneeDrop > supportDrop * 0.85`) which instantly detects if the knees have dropped to the floor level regardless of whether the ankles are visible.

### 3.4 Relaxed Confidence Thresholds
- **Decision**: Lowered the minimum required frame quality (to 0.35), keypoint confidence (to 0.2), and increased the horizontal tilt tolerance.
- **Tradeoff**: Makes the tracker highly forgiving to varied camera angles and poor lighting, preventing false disqualifications. The AI relies heavily on the geometric constraints (e.g., knee drop, elevation ratio) rather than raw model confidence to enforce rules.

### 3.5 Environment Variables for Edge Runtimes
- **Decision**: Refactored environment variables (e.g. Supabase keys) to be statically accessed via `process.env.NEXT_PUBLIC_...` rather than dynamic array access.
- **Tradeoff**: Less DRY (Don't Repeat Yourself) code in the env loader, but strictly necessary for Next.js to inline the variables correctly during Vercel's production build step for Edge middleware and client components.

## 4. Scoring Algorithm
The final score is designed to reward endurance while punishing poor form:
1. **Valid Seconds**: Total frames where form is geometrically valid / target FPS.
2. **Form Score**: `(Valid Seconds / Total Seconds) * 100`
3. **Combined Score**: `Valid Seconds * √(Form Score / 100)`

A 3-minute hold at 100% perfect form mathematically scores higher than a 4-minute hold where the user was sagging their hips 50% of the time.

## 5. Security & Data Integrity
- **Row Level Security (RLS)**: Enforced at the Postgres level. Users can only insert attempts tied to their own authenticated UUID.
- **Admin Gating**: The `/admin` dashboard is protected by Next.js middleware checking for a secure `ADMIN_PASSWORD` cookie before rendering the page.

## 6. Future Expansion Roadmap
- **Offline / Native Capabilities**: Transitioning the React web app to React Native for better native camera control.
- **Server-Side Auditing**: Allowing top-10 leaderboard submissions to optionally upload raw video for asynchronous server-side verification using a heavier model before official shortlisting.
