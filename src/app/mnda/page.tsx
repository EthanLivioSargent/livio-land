import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { hasSignedCurrentMnda } from "@/lib/mnda-actions";
import {
  MNDA_TITLE,
  MNDA_INTRO,
  MNDA_SECTIONS,
  MNDA_VERSION,
  MNDA_DISCLOSING_PARTY,
} from "@/content/mnda";
import { MndaSignForm } from "./sign-form";
import { MndaSuggestForm } from "./suggest-form";

// Force dynamic rendering — gate state depends on user session.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ next?: string }> };

export default async function MndaPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const next = params?.next || "/";

  // Anonymous visitors must sign in first; we send them to signup with a return URL.
  if (!user) {
    const target = `/auth/signup?next=${encodeURIComponent(`/mnda?next=${encodeURIComponent(next)}`)}`;
    redirect(target);
  }

  // Already signed the current version? Bounce back to where they were going.
  if (await hasSignedCurrentMnda()) redirect(next);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
        <strong className="font-semibold">Before you can browse listings,</strong> Livio requires
        every off-taker, supplier, and visitor to sign this Mutual NDA &amp; Non-Circumvention
        agreement. Listings on Livio Land contain confidential PPA terms, interconnection
        documents, and counterparty introductions — this agreement protects everyone.
      </div>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{MNDA_TITLE}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Version {MNDA_VERSION} · Between you and {MNDA_DISCLOSING_PARTY.name}
          </p>
        </div>
        {/* Download as plain text — counsel typically wants a copy to mark
            up offline. .txt opens cleanly in Word/Pages/Docs and supports
            Track Changes there. The route is cached at the CDN since the
            content only changes when MNDA_VERSION bumps. */}
        <a
          href="/api/mnda/download"
          download
          className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50"
        >
          ↓ Download MNDA (.txt)
        </a>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 max-h-[480px] overflow-y-auto text-sm leading-relaxed text-slate-700">
        <p className="whitespace-pre-line">{MNDA_INTRO}</p>
        {MNDA_SECTIONS.map((s) => (
          <section key={s.heading} className="mt-5">
            <h2 className="font-semibold text-slate-900 text-base">{s.heading}</h2>
            <p className="mt-1 whitespace-pre-line">{s.body}</p>
          </section>
        ))}
        <div className="mt-6 border-t border-slate-200 pt-4">
          <p className="font-semibold text-slate-900">Signed for Livio Building Systems, Inc.:</p>
          <p className="mt-1">
            {MNDA_DISCLOSING_PARTY.signer}, {MNDA_DISCLOSING_PARTY.title}
            <br />
            {MNDA_DISCLOSING_PARTY.address}
          </p>
        </div>
      </div>

      <MndaSignForm
        defaultName={user.name}
        defaultCompany={user.company || ""}
        defaultEmail={user.email}
        nextUrl={next}
      />

      {/* Redline / propose-changes path — sits below the sign form so
          counterparties who don't want to sign as-is have a clear next
          step that doesn't drop the conversation. */}
      <MndaSuggestForm />
    </div>
  );
}
