import Link from "next/link";
import { prisma } from "@/lib/db";

// Stats query the live DB on every request — without force-dynamic, Next.js
// serves a cached homepage that lies about the listing count after admins
// approve/reject/demote anything.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Public stats — only count APPROVED listings, not pending drafts.
  // (Pending listings are hidden from browse pages, so the count + MW totals
  //  on the homepage need to match what the public can actually see.)
  const publicWhere = { status: "available", approvalStatus: "approved" } as const;
  const [dcCount, landCount, totalMW] = await Promise.all([
    prisma.dataCenterListing.count({ where: publicWhere }),
    prisma.poweredLandListing.count({ where: publicWhere }),
    prisma.dataCenterListing
      .aggregate({
        _sum: { availableMW: true },
        where: publicWhere,
      })
      .then((r) => r._sum.availableMW || 0),
  ]);
  const landMW = await prisma.poweredLandListing
    .aggregate({
      _sum: { availableMW: true },
      where: publicWhere,
    })
    .then((r) => r._sum.availableMW || 0);

  return (
    <div>
      {/* Hero */}
      <section className="bg-hero-gradient border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-20">
          <div className="max-w-3xl">
            <span className="inline-block rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
              ⚡ The marketplace for powered land & DC capacity
            </span>
            <h1 className="mt-4 text-5xl font-bold tracking-tight text-slate-900">
              Connect off-takers with{" "}
              <span className="text-brand-600">power</span> and{" "}
              <span className="text-emerald-600">land</span>.
            </h1>
            <p className="mt-4 text-xl text-slate-700">
              Livio Land is where data center operators, land owners, and
              hyperscalers find each other. List capacity. Search by MW.
              Ask the questions that actually move deals — water, PPA,
              interconnection stage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/listings/dc"
                className="rounded-md bg-brand-600 px-5 py-3 font-medium text-white hover:bg-brand-700"
              >
                Browse DC capacity
              </Link>
              <Link
                href="/listings/land"
                className="rounded-md bg-emerald-600 px-5 py-3 font-medium text-white hover:bg-emerald-700"
              >
                Browse powered land
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-md border border-slate-300 bg-white px-5 py-3 font-medium text-slate-900 hover:border-slate-400"
              >
                List your site →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-4 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          <Stat label="DC listings" value={dcCount.toString()} />
          <Stat label="Land listings" value={landCount.toString()} />
          <Stat label="DC capacity available" value={`${Math.round(totalMW)} MW`} />
          <Stat label="Powered land available" value={`${Math.round(landMW)} MW`} />
        </div>
      </section>

      {/* Two-sided */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-16 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl bg-white border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900">For suppliers</h2>
            <p className="mt-2 text-slate-600">
              Sitting on spare capacity or a powered parcel? Get it in front of
              hyperscalers, AI labs, and HPC operators actively shopping for
              MW.
            </p>
            <ul className="mt-6 space-y-3 text-slate-700">
              <Bullet>List DC capacity with full specs — tier, PUE, cooling, network</Bullet>
              <Bullet>List powered land with PPA & interconnection details</Bullet>
              <Bullet>Answer buyer questions publicly — build trust</Bullet>
            </ul>
            <Link
              href="/listings/new"
              className="mt-6 inline-block rounded-md bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
            >
              Create a listing
            </Link>
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-8">
            <h2 className="text-2xl font-bold text-slate-900">For off-takers</h2>
            <p className="mt-2 text-slate-600">
              Stop hunting through brokers and back-channel intros. Find
              capacity and land that match your specs in minutes.
            </p>
            <ul className="mt-6 space-y-3 text-slate-700">
              <Bullet>Filter by MW, location, rate, tier, interconnection stage</Bullet>
              <Bullet>Read public Q&amp;A from other off-takers</Bullet>
              <Bullet>Ask the questions that matter — water, condition, PPA</Bullet>
            </ul>
            <Link
              href="/listings/dc"
              className="mt-6 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
            >
              Start searching
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
    </div>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="text-brand-600 font-bold">✓</span>
      <span>{children}</span>
    </li>
  );
}
