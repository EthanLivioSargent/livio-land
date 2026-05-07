import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { landListingsVisibleToWhere } from "@/lib/access";
import { LandFilterBar } from "@/components/land-filter-bar";
import { AiSearch } from "@/components/ai-search";
import { ListingsMap } from "@/components/listings-map";
import { parseAiQuery, scoreListingAgainstQuery, type ParsedQuery } from "@/lib/ai-query";
import { getR2DownloadUrl, isR2Configured } from "@/lib/r2";
import { Prisma } from "@prisma/client";

// Listings page hits the DB on every request (per-user access filtering, fresh
// approvalStatus from admin actions). Without force-dynamic, Next.js route
// caches the rendered output and the seedDemoLandListings + revalidatePath
// pair stops being enough to show new rows in browse. Cheap to render anyway.
export const dynamic = "force-dynamic";

interface Props {
  searchParams: {
    q?: string;
    minMW?: string;
    maxMW?: string;
    minAcres?: string;
    state?: string;
    interconnection?: string;
    ppa?: string;
    deal?: string;
    water?: string;
    fiber?: string;
    maxPrice?: string;
    sort?: string;
    aiq?: string; // natural-language AI query — parsed server-side into the filter set
  };
}

export default async function LandListingsPage({ searchParams }: Props) {
  const f = searchParams;
  const user = await getCurrentUser();
  if (!user) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === "string" && v.length > 0) qs.set(k, v);
    }
    const next = qs.toString() ? `/listings/land?${qs.toString()}` : "/listings/land";
    redirect(`/auth/signin?next=${encodeURIComponent(next)}`);
  }

  let parsedAi: ParsedQuery | null = null;
  if (f.aiq && f.aiq.trim().length >= 4) {
    try {
      parsedAi = await parseAiQuery(f.aiq);
    } catch {
      parsedAi = { intent: f.aiq };
    }
  }

  const eff = {
    state: f.state || parsedAi?.state,
    minMW: f.minMW ? Number(f.minMW) : parsedAi?.minMW,
    maxMW: f.maxMW ? Number(f.maxMW) : parsedAi?.maxMW,
    minAcres: f.minAcres ? Number(f.minAcres) : parsedAi?.minAcres,
    ppa: f.ppa || parsedAi?.ppa,
    interconnection: f.interconnection || parsedAi?.interconnection,
    water: f.water || parsedAi?.water,
    fiber: f.fiber || parsedAi?.fiber,
    deal: f.deal || parsedAi?.deal,
    maxPrice: f.maxPrice ? Number(f.maxPrice) : parsedAi?.maxPrice,
  };

  const access = landListingsVisibleToWhere({
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
  });
  const where: Prisma.PoweredLandListingWhereInput = {
    ...(access as Prisma.PoweredLandListingWhereInput),
  };
  if (f.q) {
    where.OR = [
      { title: { contains: f.q } },
      { location: { contains: f.q } },
      { description: { contains: f.q } },
      { county: { contains: f.q } },
      { state: { contains: f.q } },
    ];
  }
  if (eff.minMW != null) where.availableMW = { ...((where.availableMW as object) || {}), gte: eff.minMW };
  if (eff.maxMW != null) where.availableMW = { ...((where.availableMW as object) || {}), lte: eff.maxMW };
  if (eff.minAcres != null) where.acres = { gte: eff.minAcres };
  if (eff.state) where.state = eff.state;
  if (eff.interconnection) where.interconnectionStage = eff.interconnection;
  if (eff.ppa) where.ppaStatus = eff.ppa;
  if (eff.deal) where.pricingModel = eff.deal;
  if (eff.water) where.waterAvailable = eff.water;
  if (eff.fiber) where.fiberAvailable = eff.fiber;
  if (eff.maxPrice != null) where.askingPrice = { lte: eff.maxPrice };

  let orderBy: Prisma.PoweredLandListingOrderByWithRelationInput = { createdAt: "desc" };
  if (f.sort === "mw-desc") orderBy = { availableMW: "desc" };
  else if (f.sort === "mw-asc") orderBy = { availableMW: "asc" };
  else if (f.sort === "price-asc") orderBy = { askingPrice: "asc" };
  else if (f.sort === "price-desc") orderBy = { askingPrice: "desc" };
  else if (f.sort === "acres-desc") orderBy = { acres: "desc" };

  const listings = await prisma.poweredLandListing.findMany({
    where,
    orderBy,
    include: {
      owner: { select: { name: true, company: true } },
      photos: {
        orderBy: [{ sortOrder: "asc" }, { uploadedAt: "asc" }],
        take: 1,
        select: { id: true, r2Key: true },
      },
    },
  });

  const r2Ready = isR2Configured();
  const coverByListing: Record<string, string | null> = {};
  await Promise.all(
    listings.map(async (l) => {
      const first = l.photos[0];
      if (!first) {
        coverByListing[l.id] = null;
        return;
      }
      const isUrl = first.r2Key.startsWith("http://") || first.r2Key.startsWith("https://");
      if (!isUrl && !r2Ready) {
        coverByListing[l.id] = null;
        return;
      }
      try {
        coverByListing[l.id] = await getR2DownloadUrl(first.r2Key);
      } catch {
        coverByListing[l.id] = null;
      }
    }),
  );

  let listingsSorted = listings;
  if (parsedAi) {
    listingsSorted = [...listings].sort((a, b) => {
      const sa = scoreListingAgainstQuery(a, parsedAi!);
      const sb = scoreListingAgainstQuery(b, parsedAi!);
      return sb - sa;
    });
  }

  const listingsWithAccess = listingsSorted.map((l) => {
    let accessBadge: "yours" | "shared" | "public" = "public";
    if (l.ownerId === user.id) accessBadge = "yours";
    else if (l.visibility !== "public") accessBadge = "shared";
    const score = parsedAi ? scoreListingAgainstQuery(l, parsedAi) : null;
    return { listing: l, accessBadge, score, cover: coverByListing[l.id] };
  });

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? null;

  const mapListings = listingsWithAccess.map(({ listing: l }) => ({
    id: l.id,
    title: l.title,
    state: l.state,
    county: l.county,
    availableMW: l.availableMW,
    acres: l.acres,
    ppaStatus: l.ppaStatus,
    pricingModel: l.pricingModel,
    askingPrice: l.askingPrice,
  }));

  return (
    <div>
      {/* HERO — centered, big split title, AI search inline. */}
      <section className="border-b border-[var(--color-rule)] bg-gradient-to-b from-white via-emerald-50/30 to-white">
        <div className="mx-auto max-w-5xl px-6 lg:px-10 pt-16 pb-12 text-center">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.02]">
            Powered land,{" "}
            <span className="text-emerald-700">on the map.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[60ch] text-[16px] leading-[1.6] text-neutral-700">
            Every utility-ready parcel currently listed on Livio Land. Pan the
            map, filter by MW and PPA status, or describe your ideal site in
            plain English and let AI rank them for you.
          </p>
          <div className="mt-8">
            <AiSearch variant="compact" defaultValue={f.aiq ?? ""} />
          </div>
          {parsedAi && (
            <div className="mt-4 text-left">
              <AiQuerySummary parsed={parsedAi} originalQuery={f.aiq ?? ""} />
            </div>
          )}
        </div>
      </section>

      {/* MAP — sits centered, full width of the content column, between
          the AI search above and the filter bar below. */}
      <section className="border-b border-[var(--color-rule)] bg-neutral-50/40">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-8">
          <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="h-[520px] w-full">
              <ListingsMap listings={mapListings} apiKey={mapsKey} layout="split" />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-neutral-500">
            Pins show approximate state centroid · click for site details · per-listing geocoding next.
          </p>
        </div>
      </section>

      {/* FILTER BAR + RESULTS — full width grid below the map. */}
      <section className="border-b border-[var(--color-rule)]">
        <div className="mx-auto max-w-7xl px-6 lg:px-10 py-10">
          <LandFilterBar />

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="text-[11px] uppercase tracking-[0.14em] font-semibold text-emerald-700">
              {listingsWithAccess.length} {listingsWithAccess.length === 1 ? "result" : "results"}
              {parsedAi ? " · ranked by AI relevance" : " · newest first"}
            </div>
            <Link
              href="/listings/new/land"
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-emerald-800 transition"
            >
              + List land <span aria-hidden>→</span>
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              <div className="text-base font-medium text-slate-700">No listings match your filters.</div>
              <Link
                href="/listings/land"
                className="mt-3 inline-flex items-center gap-1 text-emerald-700 font-medium hover:underline"
              >
                Clear all filters →
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {listingsWithAccess.map(({ listing: l, accessBadge, score, cover }) => (
                <ListingCard
                  key={l.id}
                  listing={l}
                  accessBadge={accessBadge}
                  score={score}
                  cover={cover}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ListingCard({
  listing: l,
  accessBadge,
  score,
  cover,
}: {
  listing: {
    id: string;
    title: string;
    location: string;
    county: string | null;
    acres: number;
    availableMW: number;
    ppaStatus: string | null;
    interconnectionStage: string | null;
    waterAvailable: string | null;
    pricingModel: string;
    askingPrice: number | null;
    owner: { name: string; company: string | null };
  };
  accessBadge: "yours" | "shared" | "public";
  score: number | null;
  cover: string | null;
}) {
  return (
    <Link
      href={`/listings/land/${l.id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-lg hover:-translate-y-0.5 transition-all"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={l.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-emerald-700/50 text-xs uppercase tracking-wide">
            No photo yet
          </div>
        )}
        {score != null && (
          <span
            className={`absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm ${
              score >= 70 ? "bg-emerald-600" : score >= 50 ? "bg-amber-500" : "bg-slate-500"
            }`}
            title="AI relevance to your query"
          >
            {score}% match
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 shadow-sm">
          {l.pricingModel}
        </span>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition leading-snug text-[15px]">{l.title}</h3>
          {accessBadge === "yours" && (
            <span className="shrink-0 rounded-full bg-slate-900 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white">
              Yours
            </span>
          )}
          {accessBadge === "shared" && (
            <span className="shrink-0 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-violet-800">
              Shared
            </span>
          )}
        </div>
        <p className="mt-1 text-[12px] text-slate-500">
          {l.location}{l.county ? ` · ${l.county}` : ""} · {l.acres} acres
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-[13px]">
          <Spec label="Power" value={`${l.availableMW} MW`} accent />
          <Spec label="PPA" value={l.ppaStatus || "—"} />
          <Spec label="ICX" value={l.interconnectionStage || "—"} />
          <Spec label="Water" value={l.waterAvailable || "—"} />
          {l.askingPrice && (
            <Spec label="Asking" value={`$${(l.askingPrice / 1_000_000).toFixed(1)}M`} />
          )}
          {l.askingPrice && (
            <Spec label="$/MW" value={`$${Math.round(l.askingPrice / l.availableMW / 1000)}k`} />
          )}
        </div>
        <p className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
          Listed by {l.owner.company || l.owner.name}
        </p>
      </div>
    </Link>
  );
}

function Spec({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</div>
      <div className={accent ? "text-emerald-700 font-semibold" : "text-slate-900 font-medium"}>{value}</div>
    </div>
  );
}

function AiQuerySummary({
  parsed,
  originalQuery,
}: {
  parsed: ParsedQuery;
  originalQuery: string;
}) {
  const chips: string[] = [];
  if (parsed.state) chips.push(parsed.state);
  if (parsed.minMW != null) {
    chips.push(parsed.maxMW != null ? `${parsed.minMW}–${parsed.maxMW} MW` : `${parsed.minMW}+ MW`);
  } else if (parsed.maxMW != null) {
    chips.push(`up to ${parsed.maxMW} MW`);
  }
  if (parsed.minAcres) chips.push(`${parsed.minAcres}+ acres`);
  if (parsed.ppa) chips.push(`PPA ${parsed.ppa}`);
  if (parsed.interconnection) chips.push(parsed.interconnection);
  if (parsed.water === "yes") chips.push("water on site");
  if (parsed.fiber === "yes") chips.push("fiber on site");
  if (parsed.deal) chips.push(parsed.deal);
  if (parsed.maxPrice != null) chips.push(`under $${(parsed.maxPrice / 1_000_000).toFixed(1)}M`);

  return (
    <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 px-4 py-3 text-sm text-emerald-900">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700">
          We read this as
        </span>
        {chips.length === 0 ? (
          <span className="text-emerald-800/80 italic">
            We couldn&apos;t parse specific filters from &quot;{originalQuery}&quot;. Showing all listings, ranked by best match.
          </span>
        ) : (
          chips.map((c) => (
            <span
              key={c}
              className="rounded-full bg-white border border-emerald-200 px-2.5 py-0.5 text-xs font-medium"
            >
              {c}
            </span>
          ))
        )}
      </div>
      {parsed.intent && originalQuery && parsed.intent !== originalQuery && (
        <div className="mt-1.5 text-[12px] text-emerald-800/70">
          Original: &ldquo;{originalQuery}&rdquo;
        </div>
      )}
    </div>
  );
}

