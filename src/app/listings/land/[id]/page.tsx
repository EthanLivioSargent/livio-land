import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { canViewLandListing } from "@/lib/access";
import { QAndA } from "@/components/q-and-a";
import { OwnerActions } from "@/components/owner-actions";
import { MessageForm } from "@/components/message-form";
import { PhotoUpload } from "@/components/photo-upload";
import { InviteManager } from "@/components/invite-manager";
import { getListingPhotos } from "@/lib/photo-actions";
import { postLandListing } from "@/lib/listing-actions";
import { maskedValue, type LandViewerPerms } from "@/lib/listing-privacy";

export default async function LandListingDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { posted?: string; preview?: string };
}) {
  const justPosted = searchParams?.posted === "1";
  // Preview mode — owner viewing as if they were a public off-taker so they
  // can see exactly what's hidden behind privacy toggles before posting.
  const previewAsPublic = searchParams?.preview === "1";
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
      // Owner-only data; we render the InviteManager below using these.
      invites: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          status: true,
          createdAt: true,
          acceptedAt: true,
        },
      },
    },
  });

  if (!listing) notFound();
  const user = await getCurrentUser();

  // Privacy gate. Send unsigned-in users to sign-in (preserving destination
  // via middleware). Authed users without access get a 404 — we deliberately
  // don't say "this listing is private", that would leak its existence.
  if (!user) {
    redirect(`/auth/signin?next=/listings/land/${listing.id}`);
  }
  const canView = await canViewLandListing(
    {
      id: listing.id,
      ownerId: listing.ownerId,
      visibility: listing.visibility,
      approvalStatus: listing.approvalStatus,
    },
    { id: user.id, email: user.email, isAdmin: user.isAdmin },
  );
  if (!canView) notFound();

  const isOwnerActual = user.id === listing.ownerId;
  // In preview mode the owner sees the page as a public viewer would.
  const isOwner = isOwnerActual && !previewAsPublic;
  const photos = await getListingPhotos("land", listing.id);

  // Privacy perms for masking individual fields. Anyone who's the owner
  // (in non-preview mode) or an admin sees everything. Future: add
  // hasContactedOwner so MNDA-signed off-takers who messaged also see it.
  const perms: LandViewerPerms = {
    isOwner,
    isAdmin: !!user.isAdmin && !previewAsPublic,
    isPrivilegedViewer: false,
  };
  const m = (fieldName: string, formatted: string): string =>
    maskedValue(fieldName, null, formatted, listing.privateFields, perms);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Link href="/listings/land" className="text-sm text-emerald-700 hover:underline">
        ← Back to powered land
      </Link>

      {/* Preview banner — owner is viewing the listing as a public off-taker
          would see it (private fields masked, owner controls hidden). Shown
          ONLY when the actual owner has appended ?preview=1. */}
      {isOwnerActual && previewAsPublic && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 flex flex-wrap items-center justify-between gap-3">
          <div>
            <strong className="font-semibold">Preview mode.</strong> This is exactly what
            off-takers will see — private fields are masked, your edit/delete controls are
            hidden. Looks good?
          </div>
          <div className="flex gap-2">
            <Link
              href={`/listings/land/${listing.id}`}
              className="rounded-md bg-white border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
            >
              Exit preview
            </Link>
            <Link
              href={`/listings/land/${listing.id}/edit`}
              className="rounded-md bg-white border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Edit more
            </Link>
          </div>
        </div>
      )}

      {/* Owner-only status banner: shows pending/approved state and a Post
          button when there's something to do. Hidden from public viewers. */}
      {isOwner && (
        <div className="mt-4">
          {justPosted ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <strong className="font-semibold">✓ Posted.</strong> Your listing is in the
              admin review queue. We&apos;ll email you when it&apos;s approved and visible to off-takers.
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
              <strong className="font-semibold">✓ Live.</strong>{" "}
              {listing.visibility === "public"
                ? "Your listing is visible to AI data center developers actively sourcing land on Livio Land."
                : "Your listing is private — only emails you invite can view it."}
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Powered Land
              </span>
              {listing.visibility === "private" ? (
                <span
                  title="Only people the owner invites can see this listing."
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
                >
                  <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path
                      fillRule="evenodd"
                      d="M10 1a4.5 4.5 0 0 0-4.5 4.5V8H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 7V5.5a3 3 0 0 0-6 0V8h6Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Private
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Public
                </span>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{listing.title}</h1>
            <p className="text-slate-600">
              {listing.location}, {listing.country}
            </p>
          </div>
          <div className="text-right text-sm text-slate-600">
            <div>Listed by</div>
            <div className="font-medium text-slate-900">
              {listing.owner.company || listing.owner.name}
            </div>
            {(isOwner || user.isAdmin) && (
              <div className="mt-3 flex justify-end">
                <OwnerActions
                  listingType="land"
                  listingId={listing.id}
                  isAdmin={!!user.isAdmin && !isOwner}
                />
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-slate-200 pt-6">
          <Stat label="Power" value={m("availableMW", `${listing.availableMW} MW`)} highlight />
          <Stat label="Acres" value={m("acres", `${listing.acres}`)} />
          <Stat label="Deal" value={m("pricingModel", listing.pricingModel)} />
          <Stat
            label="Asking"
            value={m(
              "askingPrice",
              listing.askingPrice
                ? `$${listing.askingPrice.toLocaleString()}`
                : "On request",
            )}
          />
        </div>

        {/* "Run analysis" CTA — deep-links into Livio Grid (the engineering /
            underwriting product) with this site's MW + location pre-filled,
            so an AI-data-center buyer can go from "interesting parcel" to
            "fully engineered + IC-ready CapEx model" in 4 hours. */}
        <div className="mt-6 rounded-lg border-2 border-brand-200 bg-brand-50 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-brand-900">
                Engineer this site in 4 hours with Livio Grid
              </div>
              <div className="mt-1 text-xs text-brand-800">
                Auto-generates SLDs, floor plans, CapEx waterfall, IRR/NPV, equipment
                schedule, and a photoreal 3D walkthrough — keyed off this site's
                {" "}{listing.availableMW} MW and {listing.location} location.
              </div>
            </div>
            <Link
              href={`https://grid.golivio.com/?mw=${encodeURIComponent(
                String(listing.availableMW),
              )}&location=${encodeURIComponent(
                `${listing.location}, ${listing.state ?? ""} ${listing.country}`.trim(),
              )}&source=livio-land&listingId=${encodeURIComponent(listing.id)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Run analysis →
            </Link>
          </div>
        </div>

        {(photos.length > 0 || isOwner) && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <h2 className="font-semibold text-slate-900">Site photos &amp; documents</h2>
            <div className="mt-3">
              <PhotoUpload
                type="land"
                listingId={listing.id}
                photos={photos}
                canEdit={isOwner || !!user.isAdmin}
              />
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
          <h2 className="font-semibold text-slate-900">Power &amp; Interconnection</h2>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat label="Utility / ISO" value={m("utilityProvider", listing.utilityProvider || "—")} />
            <Stat
              label="Substation"
              value={m(
                "substationDistanceMiles",
                listing.substationDistanceMiles != null
                  ? `${listing.substationDistanceMiles} mi`
                  : "—",
              )}
            />
            <Stat label="Interconnection" value={m("interconnectionStage", listing.interconnectionStage || "—")} />
            <Stat label="PPA status" value={m("ppaStatus", listing.ppaStatus || "—")} />
            <Stat
              label="PPA price"
              value={m(
                "ppaPricePerMWh",
                listing.ppaPricePerMWh ? `$${listing.ppaPricePerMWh}/MWh` : "—",
              )}
            />
            <Stat
              label="Energization"
              value={m(
                "expectedEnergization",
                listing.expectedEnergization
                  ? new Date(listing.expectedEnergization).toLocaleDateString()
                  : "—",
              )}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <h2 className="font-semibold text-slate-900">Site Conditions</h2>
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat label="Water" value={m("waterAvailable", listing.waterAvailable || "—")} />
            <Stat label="Fiber" value={m("fiberAvailable", listing.fiberAvailable || "—")} />
            <Stat label="Zoning" value={m("zoning", listing.zoning || "—")} />
          </div>
          {listing.waterSourceNotes && (
            <p className="mt-3 text-sm text-slate-700">
              <span className="font-medium">Water notes: </span>
              {m("waterSourceNotes", listing.waterSourceNotes)}
            </p>
          )}
        </div>
      </div>

      {/* Owner-only privacy + invites panel */}
      {isOwner && (
        <InviteManager
          listingId={listing.id}
          visibility={listing.visibility}
          invites={listing.invites.map((i) => ({
            id: i.id,
            email: i.email,
            status: i.status,
            createdAt: i.createdAt.toISOString(),
            acceptedAt: i.acceptedAt ? i.acceptedAt.toISOString() : null,
          }))}
        />
      )}

      {!isOwner && (
        <div className="mt-6">
          <MessageForm
            listingType="land"
            listingId={listing.id}
            ownerName={listing.owner.company || listing.owner.name}
            isSignedIn={!!user}
            isOwner={isOwner}
          />
        </div>
      )}
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
