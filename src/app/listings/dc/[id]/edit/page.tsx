import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { updateDcListing } from "@/lib/listing-actions";
import { ListingForm, FormField, FormSection } from "@/components/listing-form";
import { PhotoUpload } from "@/components/photo-upload";
import { getListingPhotos } from "@/lib/photo-actions";

export default async function EditDcListingPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { fresh?: string };
}) {
  const justCreated = searchParams?.fresh === "1";
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const listing = await prisma.dataCenterListing.findUnique({
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
          href={`/listings/dc/${listing.id}`}
          className="mt-4 inline-block text-brand-600 hover:underline"
        >
          ← Back to listing
        </Link>
      </div>
    );
  }
  const update = updateDcListing.bind(null, listing.id);
  const isoDate = (d: Date | null | undefined) =>
    d ? new Date(d).toISOString().slice(0, 10) : "";
  const photos = await getListingPhotos("dc", listing.id);

  return (
    <div className="mx-auto max-w-3xl py-10 px-4">
      <Link
        href={`/listings/dc/${listing.id}`}
        className="text-sm text-brand-600 hover:underline"
      >
        ← Back to listing
      </Link>
      <h1 className="mt-4 text-3xl font-bold text-slate-900">
        {justCreated ? "Add photos and finish your listing" : "Edit DC Listing"}
      </h1>
      <p className="mt-2 text-slate-600">
        {user.isAdmin && listing.ownerId !== user.id ? (
          <span className="rounded-md bg-red-50 px-2 py-0.5 text-sm text-red-700">
            Admin edit
          </span>
        ) : justCreated ? (
          "Listing saved as a draft. Add facility photos, drone shots, certifications, or one-pagers below — these are what off-takers see when they open your listing. Then click Save changes."
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

      {/* Photo upload moved to the TOP of the page so suppliers see it first. */}
      <div className="mt-8 rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">Facility photos &amp; documents</h2>
        <p className="mt-1 text-sm text-slate-500">
          Upload facility photos, drone shots, network topology diagrams, certifications, or
          one-pagers. Off-takers see these on the listing once approved. Files upload immediately
          when you drop them — no need to click Save first.
        </p>
        <div className="mt-4">
          <PhotoUpload type="dc" listingId={listing.id} photos={photos} canEdit={true} />
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

          <FormSection title="Capacity & Availability">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="totalCapacityMW"
                label="Total facility MW"
                type="number"
                step="0.1"
                required
                defaultValue={String(listing.totalCapacityMW)}
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
              name="availabilityDate"
              label="Available from"
              type="date"
              required
              defaultValue={isoDate(listing.availabilityDate)}
            />
          </FormSection>

          <FormSection title="Pricing">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="ratePerKWh"
                label="Rate ($/kWh)"
                type="number"
                step="0.001"
                defaultValue={listing.ratePerKWh != null ? String(listing.ratePerKWh) : ""}
              />
              <FormField
                name="pricingModel"
                label="Pricing model"
                type="select"
                defaultValue={listing.pricingModel}
                options={[
                  { value: "per-kWh", label: "Per kWh" },
                  { value: "per-kW-month", label: "Per kW per month" },
                  { value: "custom", label: "Custom / negotiated" },
                ]}
              />
            </div>
            <FormField
              name="contractMinYears"
              label="Min contract term (years)"
              type="number"
              defaultValue={listing.contractMinYears != null ? String(listing.contractMinYears) : ""}
            />
          </FormSection>

          <FormSection title="Technical Specs">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="tier"
                label="Tier"
                type="select"
                defaultValue={listing.tier ?? ""}
                options={[
                  { value: "", label: "—" },
                  { value: "Tier I", label: "Tier I" },
                  { value: "Tier II", label: "Tier II" },
                  { value: "Tier III", label: "Tier III" },
                  { value: "Tier IV", label: "Tier IV" },
                ]}
              />
              <FormField
                name="pue"
                label="PUE"
                type="number"
                step="0.01"
                defaultValue={listing.pue != null ? String(listing.pue) : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                name="coolingType"
                label="Cooling"
                type="select"
                defaultValue={listing.coolingType ?? ""}
                options={[
                  { value: "", label: "—" },
                  { value: "air", label: "Air" },
                  { value: "liquid", label: "Liquid" },
                  { value: "immersion", label: "Immersion" },
                  { value: "hybrid", label: "Hybrid" },
                ]}
              />
              <FormField
                name="powerDensityKWPerRack"
                label="Density (kW / rack)"
                type="number"
                step="0.5"
                defaultValue={listing.powerDensityKWPerRack != null ? String(listing.powerDensityKWPerRack) : ""}
              />
            </div>
            <FormField
              name="network"
              label="Network / Carriers"
              defaultValue={listing.network ?? ""}
            />
            <FormField
              name="certifications"
              label="Certifications"
              defaultValue={listing.certifications ?? ""}
            />
          </FormSection>
        </ListingForm>
      </div>
    </div>
  );
}
