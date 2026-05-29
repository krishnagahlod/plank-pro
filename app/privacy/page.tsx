import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Plank-Pro League.",
};

export default function PrivacyPolicy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc">
      <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
      <p className="text-zinc-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Information We Collect</h2>
        <p className="mb-4">
          When you register for Plank-Pro, we collect your name, email address, city, and college affiliation. During an official attempt, we may collect technical device metadata (such as browser type, OS, camera resolution, and frame rates) and performance data (your attempt duration and form score).
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Camera & Video Data</h2>
        <p className="mb-4">
          Plank-Pro uses an on-device AI model to score your plank form. During <strong>practice attempts</strong>, all video processing happens locally in your browser, and no video or image data is sent to our servers.
        </p>
        <p className="mb-4">
          During <strong>official attempts</strong>, we capture periodic snapshot images from your camera as evidence to verify the integrity of your attempt. These snapshots are stored securely and are only accessible by league administrators for review and anti-cheat purposes.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. How We Use Your Information</h2>
        <p className="mb-4">
          We use your information to maintain the public leaderboard, verify competition results, and contact you if you are shortlisted for subsequent stages of the Plank-Pro league.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Data Deletion</h2>
        <p className="mb-4">
          You may request the deletion of your account and associated attempt data at any time by contacting the administration team.
        </p>
      </section>
    </div>
  );
}
