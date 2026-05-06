"use client";

// AI search bar — buyers describe the site they need in natural language and
// we route them into the browse flow. On submit:
//   - Posts ?aiq=<text> to /listings/land
//   - If the buyer isn't signed in, the page's existing redirect bounces them
//     to /auth/signin?next=… preserving the query, then back through MNDA,
//     then to the results page sorted by AI relevance.
//
// Lives on the homepage hero AND at the top of /listings/land. Same input,
// same handler, two surfaces. Variant prop controls visual scale.

import { useState } from "react";
import { useRouter } from "next/navigation";

const SUGGESTIONS = [
  "100 MW in Texas with signed PPA, energized within 12 months",
  "Cold-climate site, 60+ MW, fiber on site, sale or lease",
  "PJM region, 200 MW+, data-center overlay zoning",
  "Greenfield 50 MW MISO site with water rights",
];

export function AiSearch({
  variant = "hero",
  defaultValue = "",
}: {
  variant?: "hero" | "compact";
  defaultValue?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(defaultValue);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = text.trim();
    if (!q) return;
    setSubmitting(true);
    // Server-side parsing happens on /listings/land — see page.tsx. The
    // page will redirect to sign-in (preserving aiq) if the user isn't
    // authenticated, so this client doesn't need to know about auth state.
    router.push(`/listings/land?aiq=${encodeURIComponent(q)}`);
  };

  if (variant === "compact") {
    // /listings/land top-of-page version — tighter, single-line.
    return (
      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3"
      >
        <label className="text-[11px] uppercase tracking-[0.14em] font-semibold text-emerald-700">
          AI search
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 100 MW in Texas with signed PPA, energized within 12 months"
            className="flex-1 rounded-md border border-emerald-200 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="rounded-md bg-emerald-700 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? "Searching…" : "Search"}
          </button>
        </div>
      </form>
    );
  }

  // Hero variant — homepage. Bigger, with suggestion chips.
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-3">
        <label className="text-[11px] uppercase tracking-[0.16em] font-semibold text-emerald-700 text-center">
          Describe the site you need
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="100 MW in Texas, signed PPA, energized within 12 months"
            className="flex-1 rounded-full border border-emerald-200 bg-white px-5 py-3.5 text-[15px] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="rounded-full bg-emerald-700 px-7 py-3.5 text-[14px] font-medium text-white hover:bg-emerald-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {submitting ? "Searching…" : "Search →"}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[12px]">
          <span className="text-neutral-500">Try:</span>
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setText(s)}
              className="rounded-full border border-neutral-300 bg-white px-3 py-1 text-neutral-700 hover:border-emerald-400 hover:text-emerald-800"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
