import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Competition",
  description: "Terms of Competition for Plank-Pro League.",
};

export default function TermsOfCompetition() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc">
      <h1 className="text-3xl font-bold mb-6">Terms of Competition</h1>
      <p className="text-zinc-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Eligibility and Registration</h2>
        <p className="mb-4">
          By registering for Plank-Pro, you agree to provide accurate, current, and complete information. Users found submitting fraudulent information will be disqualified.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Official Attempts & Anti-Cheat</h2>
        <p className="mb-4">
          All &quot;Official Attempts&quot; are subject to verification. We employ a combination of on-device telemetry, AI analysis, and manual snapshot review by administrators to ensure competitive integrity.
        </p>
        <p className="mb-4">
          Attempting to manipulate the score (e.g., using props, modifying client-side code, or spoofing the camera feed) will result in immediate disqualification and a permanent ban from the league.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Administrative Review</h2>
        <p className="mb-4">
          Plank-Pro administrators reserve the right to review, flag, or reject any attempt that they deem suspicious or that violates form standards. All administrative decisions regarding attempt validity and leaderboard placement are final.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. League Shortlisting</h2>
        <p className="mb-4">
          Placing highly on the leaderboard does not guarantee an invitation to subsequent rounds. Organizers will review high-ranking candidates and may require additional in-person or live-streamed verification.
        </p>
      </section>
    </div>
  );
}
