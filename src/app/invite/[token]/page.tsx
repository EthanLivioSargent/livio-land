// Invite-acceptance page. Recipient lands here from the email link.
// Three branches:
//   1. Signed in with the right email → mark accepted, redirect to listing.
//   2. Signed in with a DIFFERENT email → show "wrong account" page with sign-out link.
//   3. Signed out → show a CTA to sign in / sign up with the invited email pre-filled.

import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptInviteToken } from "@/lib/invite-actions";

export default async function InviteAcceptPage({
  params,
}: {
  params: { token: string };
}) {
  const result = await acceptInviteToken(params.token);

  if (result.ok) {
    redirect(`/listings/land/${result.landListingId}?invited=1`);
  }

  // Falls through to a server-rendered "couldn't accept" UI.
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-6 w-6 text-amber-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 4h.01M10.07 3.34a2 2 0 0 1 3.86 0l8.4 14.6A2 2 0 0 1 20.4 21H3.6a2 2 0 0 1-1.93-3.06l8.4-14.6Z" />
          </svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">Couldn&apos;t open this invite</h1>
        <p className="mt-2 text-sm text-slate-600">{result.error}</p>

        {result.needsSignin && result.expectedEmail && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-slate-700">
              The invite was sent to{" "}
              <span className="font-medium text-slate-900">{result.expectedEmail}</span>.
              Sign in (or sign up) with that email to view the listing.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href={`/auth/signin?email=${encodeURIComponent(result.expectedEmail)}&next=/invite/${params.token}`}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Sign in
              </Link>
              <Link
                href={`/auth/signup?email=${encodeURIComponent(result.expectedEmail)}&next=/invite/${params.token}`}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Create account
              </Link>
            </div>
          </div>
        )}

        {!result.needsSignin && result.expectedEmail && (
          <div className="mt-6">
            <p className="text-sm text-slate-700">
              You&apos;re signed in with a different email. Sign out and sign back
              in as <span className="font-medium">{result.expectedEmail}</span>.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={`/auth/signout?next=/invite/${params.token}`}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Sign out
              </Link>
              <Link
                href="/dashboard"
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to dashboard
              </Link>
            </div>
          </div>
        )}

        {!result.needsSignin && !result.expectedEmail && (
          <Link
            href="/dashboard"
            className="mt-6 inline-block rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Back to dashboard
          </Link>
        )}
      </div>
    </div>
  );
}
