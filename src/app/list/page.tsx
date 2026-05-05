import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ListForm } from "@/components/list-form";

// Public, no-auth landing page that powers the invitation-link flow.
// Share land.golivio.com/list with landowners — they fill the form first,
// only get prompted for an email at the end. See
// src/lib/draft-listing-actions.ts for the full handoff.
//
// Visual style: Swiss / International Typographic Style. Asymmetric
// 12-column grid, hairline rules between sections, single emerald accent
// reserved for CTAs and the headline highlight, off-white canvas, 4×4
// emerald squares replacing all check-mark glyphs.
export const dynamic = "force-dynamic";

export default async function PublicListPage() {
  const user = await getCurrentUser();
  if (user) redirect("/listings/new/land");

  return (
    <div>
      {/* HERO */}
      <section className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 pt-20 pb-16 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-1">
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold">
              List
            </div>
          </div>
          <div className="col-span-12 md:col-span-8">
            <div className="text-[11px] uppercase tracking-[0.16em] font-semibold text-neutral-600">
              For landowners with utility-ready parcels
            </div>
            <h1 className="mt-6 text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              List your powered land in front of{" "}
              <span className="text-emerald-700">AI Data Center buyers.</span>
            </h1>
            <p className="mt-6 max-w-[60ch] text-[16px] leading-[1.6] text-neutral-700">
              Tell us about your site. We'll auto-fill the buyer questionnaire
              using AI, you'll review the details, and only at the very end
              will we ask for an email so you can save and publish.
            </p>
          </div>
        </div>

        {/* Three-fact strip — replaces the pill-style "tick" badges. */}
        <div className="border-t border-[var(--color-rule)]">
          <div className="mx-auto max-w-7xl px-6 lg:px-10 grid grid-cols-12 divide-x divide-[var(--color-rule)]">
            <Fact
              label="Seller-side fee"
              value="2%"
              note="at close · lowest in the market"
            />
            <Fact
              label="Protection"
              value="MNDA"
              note="non-circumvention before any specs"
            />
            <Fact
              label="Active buyers"
              value="11+"
              note="AI Data Center developers sourcing now"
            />
            <Fact
              label="Time to draft"
              value="~3 min"
              note="paste a paragraph · AI fills the form"
            />
          </div>
        </div>
      </section>

      {/* FORM */}
      <section>
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-20 grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-2">
            <div className="text-[11px] uppercase tracking-[0.18em] font-semibold">
              Site detail
            </div>
          </div>
          <div className="col-span-12 md:col-span-10">
            <ListForm />
            <p className="mt-12 text-[12px] text-neutral-500">
              Already have an account?{" "}
              <Link
                href="/auth/signin?next=/listings/new/land"
                className="underline-offset-4 underline text-emerald-700 hover:text-emerald-800"
              >
                Sign in to add another listing
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Fact({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="col-span-6 md:col-span-3 px-6 md:px-8 py-7">
      <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-neutral-600">
        {label}
      </div>
      <div className="mt-2 text-3xl md:text-4xl font-bold tracking-tight">
        {value}
      </div>
      <div className="mt-1 text-[12px] text-neutral-500 leading-snug">{note}</div>
    </div>
  );
}
