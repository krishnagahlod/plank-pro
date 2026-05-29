import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Safety Disclaimer",
  description: "Safety guidelines for Plank-Pro League.",
};

export default function SafetyDisclaimer() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 prose prose-zinc">
      <h1 className="text-3xl font-bold mb-6">Safety Disclaimer</h1>
      <p className="text-zinc-500 mb-8">Last Updated: {new Date().toLocaleDateString()}</p>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">1. Physical Exertion Warning</h2>
        <p className="mb-4">
          Plank-Pro requires intense physical exertion. Core endurance exercises can cause significant strain on your muscles, joints, and cardiovascular system. By participating, you acknowledge these risks and agree to participate at your own risk.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">2. Listen To Your Body</h2>
        <p className="mb-4">
          Do not push beyond your physical limits. <strong>Stop immediately</strong> if you feel dizzy, experience sharp pain, or feel unwell. A high score on a leaderboard is never worth a physical injury.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">3. Not Medical Advice</h2>
        <p className="mb-4">
          The information and services provided by Plank-Pro do not constitute medical advice. If you have any pre-existing medical conditions, are recovering from an injury, or are unsure if you are fit to participate, please consult a qualified medical professional before attempting a recorded plank.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">4. Safe Environment</h2>
        <p className="mb-4">
          Ensure your recording environment is clear of hazards. Use an appropriate exercise mat to support your elbows and forearms and avoid slipping.
        </p>
      </section>
    </div>
  );
}
