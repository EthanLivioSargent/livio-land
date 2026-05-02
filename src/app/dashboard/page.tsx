import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { AdminListingRow } from "@/app/admin/listing-row";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  // Land-only marketplace: dropped the DC findMany queries entirely.
  const [landListings, questionsAsked, pendingLand, sharedWithMe] = await Promise.all([
    prisma.poweredLandListing.findMany({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { questions: true } } },
    }),
    prisma.question.findMany({
      where: { askerId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        landListing: { select: { id: true, title: true } },
        answers: { take: 1 },
      },
    }),
    // Admin-only data — only fetched if isAdmin, otherwise empty arrays
    // so the dashboard of non-admins doesn't pay the cost.
    user.isAdmin
      ? prisma.poweredLandListing.findMany({
          where: { approvalStatus: "pending" },
          orderBy: { createdAt: "desc" },
          include: { owner: { select: { name: true, email: true, company: true } } },
        })
      : Promise.resolve([] as Array<never>),
    // Listings the user has been invited to — pulled via ListingInvite so a
    // single index hit handles both pending and accepted.
    prisma.listingInvite.findMany({
      where: { email: user.email.toLowerCase(), status: { not: "revoked" } },
      orderBy: { createdAt: "desc" },
      include: {
        landListing: {
          select: {
            id: true,
            title: true,
            location: true,
            availableMW: true,
            acres: true,
            owner: { select: { name: true, company: true } },
          },
        },
      },
    }),
  ]);
  const totalPending = pendingLand.length;

  // First-time user: never listed land, never asked a question. Show a clear
  // two-path onboarding card so they immediately know what to do — buy
  // (browse sites) or sell (list land).
  const isFirstTime =
    landListings.length === 0 && questionsAsked.length === 0 && !user.isAdmin;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-slate-600">
            Manage your listings and stay on top of off-taker questions.
          </p>
        </div>
        <Link
          href="/listings/new/land"
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          + List land
        </Link>
      </div>

      {isFirstTime && (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link
            href="/listings/land"
            className="group rounded-2xl border-2 border-brand-200 bg-brand-50 p-6 hover:border-brand-400 transition"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-brand-700">
              Sourcing for an AI data center
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 group-hover:text-brand-700">
              Browse powered land →
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Filter by MW, state, PPA status, interconnection stage. Vetted,
              MNDA-protected sites ready to underwrite.
            </p>
          </Link>
          <Link
            href="/listings/new/land"
            className="group rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-6 hover:border-emerald-400 transition"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Have land to sell
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900 group-hover:text-emerald-700">
              List your site →
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              Paste a paragraph describing your site and we auto-fill the
              questionnaire with AI. Photos, MW, PPA, interconnection — done in
              minutes.
            </p>
          </Link>
        </div>
      )}

      {/* Admin-only: pending-review queue rendered inline on the dashboard so
          admins can approve/reject without navigating to /admin. Hidden from
          regular users entirely. */}
      {user.isAdmin && (
        <section className="mt-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Pending review
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                  {totalPending}
                </span>
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                New listings waiting on your approval. Approved listings become visible to
                off-takers immediately.
              </p>
            </div>
            <Link
              href="/admin"
              className="text-sm font-medium text-brand-600 hover:underline"
            >
              Open full admin queue →
            </Link>
          </div>

          {totalPending === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
              Inbox zero — no pending listings.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {pendingLand.map((l) => (
                <AdminListingRow
                  key={l.id}
                  type="land"
                  id={l.id}
                  title={l.title}
                  location={l.location}
                  ownerName={l.owner.name}
                  ownerEmail={l.owner.email}
                  ownerCompany={l.owner.company || ""}
                  createdAt={l.createdAt.toISOString()}
                  summary={`${l.availableMW} MW · ${l.acres} acres · PPA ${l.ppaStatus ?? "—"} · ${l.interconnectionStage ?? "—"}`}
                  description={l.description || ""}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* DC Capacity section retired — Livio Land is land-only. Old DC
          listings still exist in the schema but are hidden from the UI. */}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">
            Your land listings ({landListings.length})
          </h2>
          <Link
            href="/listings/new/land"
            className="text-sm font-medium text-emerald-700 hover:underline"
          >
            + Add land listing
          </Link>
        </div>
        <div className="mt-4 grid gap-3">
          {landListings.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
              No land listed yet.
            </p>
          )}
          {landListings.map((l) => (
            <Link
              key={l.id}
              href={`/listings/land/${l.id}`}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-900">{l.title}</div>
                  <div className="text-sm text-slate-600">
                    {l.location} • {l.availableMW} MW • {l.acres} acres
                  </div>
                </div>
                <div className="text-sm text-slate-500">
                  {l._count.questions}{" "}
                  {l._count.questions === 1 ? "question" : "questions"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {sharedWithMe.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              Shared with you ({sharedWithMe.length})
            </h2>
            <span className="text-xs text-slate-500">Private listings owners invited you to view</span>
          </div>
          <div className="mt-4 grid gap-3">
            {sharedWithMe.map((inv) => (
              <Link
                key={inv.id}
                href={`/listings/land/${inv.landListing.id}`}
                className="rounded-xl border border-slate-200 bg-white p-4 hover:border-violet-500 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-violet-800">
                        Shared
                      </span>
                      <div className="font-medium text-slate-900">{inv.landListing.title}</div>
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      {inv.landListing.location} • {inv.landListing.availableMW} MW •{" "}
                      {inv.landListing.acres} acres
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>From</div>
                    <div className="text-slate-900">
                      {inv.landListing.owner.company || inv.landListing.owner.name}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {questionsAsked.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Questions you've asked
          </h2>
          <div className="mt-4 grid gap-3">
            {questionsAsked.map((q) => {
              // Land-only marketplace: any DC questions in old data are
              // ignored from this dashboard view.
              const target = q.landListing;
              if (!target) return null;
              const path = `/listings/land/${q.landListingId}`;
              return (
                <Link
                  key={q.id}
                  href={path}
                  className="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-500"
                >
                  <div className="text-sm text-slate-500">
                    On {target?.title}
                  </div>
                  <div className="mt-1 text-slate-900">{q.body}</div>
                  <div className="mt-2 text-xs text-slate-500">
                    {q.answers.length > 0 ? "Answered" : "Awaiting reply"}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
