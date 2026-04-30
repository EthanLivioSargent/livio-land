import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { QAndA } from "@/components/q-and-a";
import { OwnerActions } from "@/components/owner-actions";
import { MessageForm } from "@/components/message-form";
import { PhotoUpload } from "@/components/photo-upload";
import { getListingPhotos } from "@/lib/photo-actions";
import { postLandListing } from "@/lib/listing-actions";

export default async function LandListingDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { posted?: string };
}) {
  const justPosted = searchParams?.posted === "1";
  const listing = await prisma.poweredLandListing.findUnique({
    where: { id: params.id },
    include: {
      owner: { select: { id: true, name: true, company: true } },
      questions: {
        orderBy: { createdAt: "desc" },
        include: {
          asker: { select: { name: true, company: true } },
          answers: {
            orderBy: { createdAt: "asc" },
            include: { responder: { select: { name: true, company: true } } },
          },
        },
      },
    },
  });

  if (!listing) notFound();
  const user = await getCurrentUser();
  const isOwner = user?.id === listing.ownerId;
  const photos = await getListingPhotos("land", listing.id);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/listings/land" className="text-sm text-brand-600 hover:underline">
        ← Back to powered land
      </Link>

      {/* Owner-only status banner: shows pending/approved state and a Post
          button when there's something to do. Hidden from public viewers. */}
      {isOwner && (
        <div className="mt-4">
          {justPosted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <strong className="font-semibold">✓ Posted.</strong> Your listing is in the
              admin review queue. We'll email you when it's approved and visible to off-takers.
            </div>
          ) : listing.approvalStatus === "pending" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <div>
                <strong className="font-semibold">Draft — not yet visible.</strong> Click
                Post to submit for admin review. Make sure photos and key details are filled
                in first.
              </div>
              <form action={postLandListing.bind(null, listing.id)}>
                <button
                  type="submit"
                  className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Post listing
                </button>
              </form>
            </div>
          ) : listing.approvalStatus === "approved" ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <strong className="font-semibold">✓ Live.</strong> Your listing is visible to
              off-takers in the powered-land marketplace.
            </div>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <strong className="font-semibold">Listing rejected.</strong> An admin has
              rejected this listing. Edit and re-post to try again.
            </div>
          )}
        </div>
      )}

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Powered Land
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{listing.title}</h1>
            <p className="text-slate-600">{listing.location}, {listing.country}</p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <div>Listed by</div>
            <div className="font-medium text-slate-900">
              {listing.owner.company || listing.owner.name}
            </div>
            {(isOwner || user?.isAdmin) && (
              <div className="mt-3 flex justify-end">
                <OwnerActions
                  listingType="land"
                  listingId={listing.id}
                  isAdmin={!!user?.isAdmin && !isOwner}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-200 pt-6">
          <Stat label="Power" value={`${listing.availableMW} MW`} highlight />
          <Stat label="Acres" value={`${listing.acres}`} />
          <Stat label="Deal" value={listing.pricingModel} />
          <Stat
            label="Asking"
            value={
              listing.askingPrice
                ? `$${listing.askingPrice.toLocaleString()}`
                : "On request"
            }
          />
        </div>

        {(photos.length > 0 || isOwner) && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="font-semibold text-slate-900">Site photos &amp; documents</h2>
            <div className="mt-3">
              <PhotoUpload type="land" listingId={listing.id} photos={photos} canEdit={isOwner || !!user?.isAdmin} />
            </div>
          </div>
        )}
        {listing.description && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="font-semibold text-slate-900">About</h2>
            <p className="mt-2 whitespace-pre-wrap text-slate-700">
              {listing.description}
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="font-semibold text-slate-900">Power & Interconnection</h2>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat label="Utility / ISO" value={listing.utilityProvider || "—"} />
            <Stat
              label="Substation"
              value={
                listing.substationDistanceMiles != null
                  ? `${listing.substationDistanceMiles} mi`
                  : "—"
              }
            />
            <Stat label="Interconnection" value={listing.interconnectionStage || "—"} />
            <Stat label="PPA status" value={listing.ppaStatus || "—"} />
            <Stat
              label="PPA price"
              value={
                listing.ppaPricePerMWh ? `$${listing.ppaPricePerMWh}/MWh` : "—"
              }
            />
            <Stat
              label="Energization"
              value={
                listing.expectedEnergization
                  ? new Date(listing.expectedEnergization).toLocaleDateString()
                  : "—"
              }
            />
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="font-semibold text-slate-900">Site Conditions</h2>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat label="Water" value={listing.waterAvailable || "—"} />
            <Stat label="Fiber" value={listing.fiberAvailable || "—"} />
            <Stat label="Zoning" value={listing.zoning || "—"} />
          </div>
          {listing.waterSourceNotes && (
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-medium">Water notes: </span>
              {listing.waterSourceNotes}
            </p>
          )}
        </div>
      </div>

      <div className="mt-6"><MessageForm listingType="land" listingId={listing.id} ownerName={listing.owner.company || listing.owner.name} isSignedIn={!!user} isOwner={isOwner} /></div>
      <QAndA
        listingType="land"
        listingId={listing.id}
        listingOwnerId={listing.ownerId}
        questions={listing.questions}
        currentUser={user}
        isOwner={isOwner}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div
        className={
          highlight
            ? "text-xl font-bold text-emerald-700"
            : "text-base font-medium text-slate-900"
        }
      >
        {value}
      </div>
    </div>
  );
}
