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
        className="flex flex-col gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50/60 p-3 shadow-sm"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
            <span aria-hidden>✨</span> AI search
          </span>
          <span className="text-[12px] font-medium text-emerald-900">
            Type anything in your own words — AI reads it and shows the best site for you.
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. I need 100 MW in Texas with signed PPA, energized within 12 months"
            className="flex-1 rounded-full border border-emerald-200 bg-white px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-700 px-6 py-2.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? "Searching…" : <>Search <span aria-hidden>→</span></>}
          </button>
        </div>
      </form>
    );
  }

  // Hero variant — homepage. Bigger, with suggestion chips.
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-3">
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 py-1.5 text-[12px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
            <span aria-hidden>✨</span> AI Search
          </div>
          <h2 className="mt-3 text-xl md:text-2xl font-semibold text-[var(--color-text)]">
            Type anything. AI finds your best site.
          </h2>
          <p className="mt-1 text-[13px] text-neutral-600 max-w-xl mx-auto">
            Describe what you need in your own words — MW, region, PPA status, water,
            timing, deal type, anything. AI reads your request and ranks every listing
            by closest match.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. I need 100 MW in Texas, signed PPA, ready to energize this year"
            className="flex-1 rounded-full border border-emerald-200 bg-white px-5 py-3.5 text-[15px] focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="rounded-full bg-emerald-700 px-7 py-3.5 text-[14px] font-medium text-white hover:bg-emerald-800 disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {submitting ? "Searching…" : <>Find my site <span aria-hidden>→</span></>}
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 text-[12px]">
          <span className="text-neutral-500">Or try:</span>
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

