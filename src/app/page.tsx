import Link from "next/link";
import { AiSearch } from "@/components/ai-search";

// Buy-side positioning: Livio Land is an engine that sources utility-ready
// powered land for AI Data Center developers. Landowners list because they
// see we represent the buyer.
//
// Visual style — standardized May 2026 to match grid.golivio.com:
//   - Centered hero (no left-side eyebrow column).
//   - Pill chip badges at top: audience pill (filled emerald) + scope pill
//     (mint outline with bullet).
//   - Massive bold split-color headline (black + emerald).
//   - Centered body paragraph, max ~58ch.
//   - Pill rounded-full CTAs with arrow icons.
//   - Tiny grey subtitle bullet line under CTAs.
//   - Section eyebrows: tiny letter-spaced uppercase emerald label centered
//     above a huge bold split-color heading.

export const dynamic = "force-dynamic";

export default async function HomePage() {
  return (
    <div>
      {/* HERO — centered, pill chips, big split title, pill CTA with arrow,
          and the AI search inline. Matches grid.golivio.com hero pattern. */}
      <section className="border-b border-[var(--color-rule)] bg-gradient-to-b from-white via-emerald-50/30 to-white">
        <div className="mx-auto max-w-5xl px-6 lg:px-10 pt-20 pb-24 text-center">
          {/* Pill chip row — audience + scope. */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-3.5 py-1 text-[12px] font-medium text-emerald-900">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              For AI DC developers · hyperscalers · AI labs · investors
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-white">
              <span aria-hidden>✦</span> MNDA-protected · vetted supply
            </span>
          </div>

          <h1 className="mt-7 text-5xl md:text-7xl font-bold tracking-tight leading-[1.02]">
            The fastest way to find your next{" "}
            <span className="text-emerald-700">AI Data Center site.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-[60ch] text-[17px] leading-[1.55] text-neutral-700">
            Livio Land is the sourcing engine that puts utility-ready powered
            parcels in front of AI Data Center developers, hyperscalers, and AI
            labs. Tell us your MW, region, and timeline — get vetted,
            MNDA-protected sites with PPA status and interconnection stage on
            file, ready to underwrite.
          </p>

          {/* AI search — primary CTA on the homepage. */}
          <div className="mt-10">
            <AiSearch variant="hero" />
          </div>

          {/* Secondary action row — pill links. */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-[14px]">
            <Link
              href="/listings/land"
              className="inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-5 py-2.5 font-medium text-neutral-800 hover:border-emerald-400 hover:text-emerald-800"
            >
              Browse all sites <span aria-hidden>→</span>
            </Link>
            <Link
              href="/list"
              className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-transparent px-5 py-2.5 font-medium text-neutral-600 hover:text-emerald-700"
            >
              I have land to list <span aria-hidden>↗</span>
            </Link>
          </div>

          {/* Tiny grey trust line under CTAs — matches Grid's "Free forever ·
              No credit card · 4-hour package" pattern. */}
          <div className="mt-5 text-[12px] text-neutral-500">
            MNDA-protected · 2% buyer-side success fee · paid only at close
          </div>
        </div>
      </section>

      {/* PROMISE STRIP — three buyer-side promises, hairline-divided. */}
      <section className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 grid grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-[var(--color-rule)]">
          <div className="col-span-12 md:col-span-4 px-0 md:px-8 py-10 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-emerald-700">
              Time to first match
            </div>
            <div className="mt-2 text-5xl font-bold tracking-tight">
              &lt; 10 min
            </div>
            <div className="mt-2 text-[13px] leading-[1.55] text-neutral-700">
              to find your ideal powered land site.
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 px-0 md:px-8 py-10 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-emerald-700">
              With every site
            </div>
            <div className="mt-2 text-3xl md:text-4xl font-bold tracking-tight leading-[1.05]">
              Feasibility report included.
            </div>
            <div className="mt-2 text-[13px] leading-[1.55] text-neutral-700">
              MW deliverability, PPA status, interconnection stage, water,
              fiber, zoning — packaged for your IC.
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 px-0 md:px-8 py-10 text-center">
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-emerald-700">
              With every purchase
            </div>
            <div className="mt-2 text-3xl md:text-4xl font-bold tracking-tight leading-[1.05]">
              Architectural rendering &amp; CDs included.
            </div>
            <div className="mt-2 text-[13px] leading-[1.55] text-neutral-700">
              Construction documents and a site rendering ship with the
              close — straight to the GC.
            </div>
          </div>
        </div>
      </section>

      {/* WHY — centered eyebrow + split-color heading, then 4-up cards. */}
      <section className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-24">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-700">
              Why Livio Land
            </div>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              Built for the buyers,{" "}
              <span className="text-emerald-700">vetted on the supply.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-[58ch] text-[15px] leading-[1.6] text-neutral-700">
              Every parcel comes with the data your underwriting team needs —
              not a broker phone number. Sellers signed an MNDA before they got
              on the platform.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ValueProp
              kicker="Demand-first"
              headline="Built for AI DC developers writing checks today."
              body="Hyperscalers, AI labs, and HPC operators source through Livio Land because every parcel comes with the data their underwriting team needs."
            />
            <ValueProp
              kicker="Vetted supply"
              headline="MW, PPA status, interconnection stage on file."
              body="Every listing has photos, acreage, deliverable MW, signed-or-pending PPA price, and an LGIA / facility-study status."
            />
            <ValueProp
              kicker="MNDA-first"
              headline="Sellers sign MNDA + non-circumvention before they list."
              body="Read site details without telling sellers what you're building. Every owner signed Livio's Mutual NDA + non-circumvention before getting on the platform."
            />
            <ValueProp
              kicker="2% — at close"
              headline="A success fee that doesn't show up in the LOI."
              body="Buyer-side success fee is 2% of total transaction value, owed only when a definitive agreement is signed. Vs. 5–6% to a traditional broker."
            />
          </div>
        </div>
      </section>

      {/* TWO-SIDED — eyebrow + split-color title centered, then two panels. */}
      <section>
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-24">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold text-emerald-700">
              How it works
            </div>
            <h2 className="mt-3 text-4xl md:text-5xl font-bold tracking-tight leading-[1.05]">
              One platform,{" "}
              <span className="text-emerald-700">two sides of the deal.</span>
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[var(--color-rule)]">
            {/* Buyer panel */}
            <div className="md:pr-12 pb-12 md:pb-0">
              <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-emerald-700">
                Primary
              </div>
              <h3 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                For AI Data Center developers
              </h3>
              <p className="mt-4 text-[15px] leading-[1.6] text-neutral-700">
                Stop sourcing through brokers and back-channel intros. Specify
                your MW, region, PPA price ceiling, and interconnection-stage
                requirements — Livio Land surfaces utility-ready parcels that
                already match.
              </p>
              <ul className="mt-6 space-y-3 text-[14px] leading-[1.55] text-neutral-800">
                <Item>Filter by MW, state, PPA status, interconnection, water, fiber</Item>
                <Item>Read public Q&amp;A from other AI DC developers about each site</Item>
                <Item>Ask water rights, zoning, energization timeline questions</Item>
                <Item>2% buyer-side success fee — paid only at close</Item>
              </ul>
              <Link
                href="/listings/land"
                className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-6 py-3 text-[14px] font-medium text-white hover:bg-emerald-800"
              >
                Start sourcing sites <span aria-hidden>→</span>
              </Link>
            </div>

            {/* Landowner panel */}
            <div className="md:pl-12 pt-12 md:pt-0">
              <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-neutral-500">
                Secondary
              </div>
              <h3 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight leading-tight">
                For landowners
              </h3>
              <p className="mt-4 text-[15px] leading-[1.6] text-neutral-700">
                The AI DC developers and hyperscalers shopping on Livio Land
                are searching for parcels right now. Listing here puts your
                site directly in front of the buyers — without a broker taking
                5%.
              </p>
              <ul className="mt-6 space-y-3 text-[14px] leading-[1.55] text-neutral-800">
                <Item>List acres, available MW, PPA status, interconnection stage</Item>
                <Item>Upload site photos, drone shots, surveys, utility LOIs</Item>
                <Item>Answer buyer questions publicly — build trust, save time on intros</Item>
                <Item>2% seller-side fee at close — the lowest in the market</Item>
              </ul>
              <Link
                href="/list"
                className="mt-8 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-text)] px-6 py-3 text-[14px] font-medium text-[var(--color-text)] hover:bg-[var(--color-text)] hover:text-[var(--color-bg)]"
              >
                List your land <span aria-hidden>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueProp({
  kicker,
  headline,
  body,
}: {
  kicker: string;
  headline: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 hover:border-emerald-400 hover:shadow-sm transition">
      <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-emerald-700">
        {kicker}
      </div>
      <div className="mt-3 text-[16px] font-semibold leading-snug text-[var(--color-text)]">
        {headline}
      </div>
      <div className="mt-3 text-[13px] leading-[1.6] text-neutral-600">{body}</div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span
        aria-hidden
        className="mt-2 inline-block h-[6px] w-[6px] rounded-full bg-emerald-600 shrink-0"
      />
      <span>{children}</span>
    </li>
  );
}

