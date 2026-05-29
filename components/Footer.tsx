import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 mt-auto py-8">
      <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center text-sm text-zinc-500">
        <div>&copy; {new Date().getFullYear()} Plank-Pro League. All rights reserved.</div>
        <div className="flex gap-6 mt-4 md:mt-0">
          <Link href="/privacy" className="hover:text-zinc-900 transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-zinc-900 transition-colors">
            Terms of Competition
          </Link>
          <Link href="/safety" className="hover:text-zinc-900 transition-colors">
            Safety
          </Link>
        </div>
      </div>
    </footer>
  );
}
