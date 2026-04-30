import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { updateLandListing } from "@/lib/listing-actions";
import { ListingForm, FormField, FormSection } from "@/components/listing-form";
import { PhotoUpload } from "@/components/photo-upload";
import { getListingPhotos } from "@/lib/photo-actions";

export default async function EditLandListingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { fresh?: string };
}) {
  const justCreated = searchParams?.fresh === "1";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const listing = await prisma.poweredLandListing.findUnique({
    where: { id: params.id },
  });
  if (!listing) notFound();
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return (
      <div className="mx-auto max-w-2xl py-16 px-4">
        <h1 className="text-2xl font-bold text-slate-900">Not allowed</h1>
        <p className="mt-2 text-slate-600">
          Only the listing owner or an administrator can edit this listing.
        </p>
        <Link
          href={`/listings/land/${listing.id}`}
          className="mt-4 inline-block text-brand-600 hover:underline"
        >
          ← Back to listing
        </Link>
      </div>
    );
  }
  const update = updateLandListing.bind(null, listing.id);
  const isoDate = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";
  const photos = await getListingPhotos("land", listing.id);

  return (
    <div className="mx-auto max-w-3xl py-10 px-4">
      <Link
        href={`/listings/land/${listing.id}`}
        className="text-sm text-brand-600 hover:underline"
      >
        ← Back to listing
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">
        {justCreated ? "Add photos and finish your listing" : "Edit Land Listing"}
      </h1>
      <p className="mt-2 text-slate-600">
        {user.isAdmin && listing.ownerId !== user.id ? (
          <span className="rounded-md bg-red-50 px-2 py-0.5 text-sm text-red-700">
            Admin edit
          </span>
        ) : justCreated ? (
          "Listing saved as a draft. Add site photos, drone shots, surveys, or PDFs below — these are what off-takers see when they open your listing. Then click Save changes."
        ) : (
          "Update the details below. Off-takers will see your changes immediately."
        )}
      </p>
      {justCreated && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">Pending admin review.</strong> Your listing is hidden
          from public browse until an admin approves it. Adding good photos and a complete
          description makes review faster.
        </div>
      )}

      {/* Photo upload moved to the TOP of the page so suppliers see it first.
          Sits outside the main <ListingForm> because PhotoUpload manages its
          own uploads via a separate server action — uploads happen as files
          are dropped, independent of the "Save changes" submission. */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Site photos &amp; documents</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload photos of the parcel, drone footage stills, topo surveys, water-rights
          documentation, or your utility LOI. Off-takers see these on the listing once approved.
          Files upload immediately when you drop them — no need to click Save first.
        </p>
        <div className="mt-4">
          <PhotoUpload type="land" listingId={listing.id} photos={photos} canEdit={true} />
        </div>
      </div>

      <div className="mt-8">
        <ListingForm action={update} submitLabel="Save changes">
          <FormSection title="Overview">
            <FormField
              name="title"
              label="Listing title"
              required
              defaultValue={listing.title}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="location"
                label="Location"
                required
                defaultValue={listing.location}
              />
              <FormField
                name="country"
                label="Country"
                defaultValue={listing.country}
              />
            </div>
            <FormField
              name="description"
              label="Description"
              type="textarea"
              defaultValue={listing.description ?? ""}
            />
          </FormSection>

          <FormSection title="Site Location">
            <FormField name="streetAddress" label="Street address (private)" defaultValue={listing.streetAddress ?? ""} />
            <div className="grid grid-cols-2 gap-4">
              <FormField name="county" label="County" defaultValue={listing.county ?? ""} />
              <FormField name="state" label="State" defaultValue={listing.state ?? ""} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField name="postalCode" label="ZIP" defaultValue={listing.postalCode ?? ""} />
              <FormField name="latitude" label="Latitude" type="number" step="0.000001" defaultValue={listing.latitude != null ? String(listing.latitude) : ""} />
              <FormField name="longitude" label="Longitude" type="number" step="0.000001" defaultValue={listing.longitude != null ? String(listing.longitude) : ""} />
            </div>
          </FormSection>

          <FormSection title="Land & Power">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="acres"
                label="Acres"
                type="number"
                step="0.1"
                required
                defaultValue={String(listing.acres)}
              />
              <FormField
                name="availableMW"
                label="Available MW"
                type="number"
                step="0.1"
                required
                defaultValue={String(listing.availableMW)}
              />
            </div>
            <FormField
              name="utilityProvider"
              label="Utility / ISO"
              defaultValue={listing.utilityProvider ?? ""}
            />
            <FormField
              name="substationDistanceMiles"
              label="Distance to nearest substation (miles)"
              type="number"
              step="0.1"
              defaultValue={listing.substationDistanceMiles != null ? String(listing.substationDistanceMiles) : ""}
            />
          </FormSection>

          <FormSection title="PPA & Interconnection">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="ppaStatus"
                label="PPA status"
                type="select"
                defaultValue={listing.ppaStatus ?? ""}
                options={[
                  { value: "", label: "—" },
                  { value: "signed", label: "Signed" },
                  { value: "in-negotiation", label: "In negotiation" },
                  { value: "available", label: "Available (not yet pursued)" },
                  { value: "none", label: "None" },
                ]}
              />
              <FormField
                name="ppaPricePerMWh"
                label="PPA price ($/MWh)"
                type="number"
                step="0.01"
                defaultValue={listing.ppaPricePerMWh != null ? String(listing.ppaPricePerMWh) : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="interconnectionStage"
                label="Interconnection stage"
                type="select"
                defaultValue={listing.interconnectionStage ?? ""}
                options={[
                  { value: "", label: "—" },
                  { value: "study", label: "Feasibility study" },
                  { value: "facility-study", label: "Facility study" },
                  { value: "LGIA", label: "LGIA executed" },
                  { value: "energized", label: "Energized" },
                ]}
              />
              <FormField
                name="expectedEnergization"
                label="Expected energization"
                type="date"
                defaultValue={isoDate(listing.expectedEnergization)}
              />
            </div>
          </FormSection>

          <FormSection title="Site Conditions">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="waterAvailable"
                label="Water available"
                type="select"
                defaultValue={listing.waterAvailable ?? ""}
                options={[
                  { value: "", label: "—" },
                  { value: "yes", label: "Yes" },
                  { value: "limited", label: "Limited" },
                  { value: "no", label: "No" },
                  { value: "unknown", label: "Unknown" },
                ]}
              />
              <FormField
                name="fiberAvailable"
                label="Fiber"
                type="select"
                defaultValue={listing.fiberAvailable ?? ""}
                options={[
                  { value: "", label: "—" },
                  { value: "yes", label: "On site" },
                  { value: "near", label: "Nearby" },
                  { value: "no", label: "None" },
                  { value: "unknown", label: "Unknown" },
                ]}
              />
            </div>
            <FormField
              name="waterSourceNotes"
              label="Water source notes"
              defaultValue={listing.waterSourceNotes ?? ""}
            />
            <FormField
              name="zoning"
              label="Zoning"
              defaultValue={listing.zoning ?? ""}
            />
          </FormSection>

          <FormSection title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="askingPrice"
                label="Asking price ($)"
                type="number"
                step="1000"
                defaultValue={listing.askingPrice != null ? String(listing.askingPrice) : ""}
              />
              <FormField
                name="pricingModel"
                label="Deal structure"
                type="select"
                defaultValue={listing.pricingModel}
                options={[
                  { value: "sale", label: "Sale" },
                  { value: "lease", label: "Lease" },
                  { value: "JV", label: "Joint venture" },
                ]}
              />
            </div>
          </FormSection>
        </ListingForm>
      </div>
    </div>
  );
}
