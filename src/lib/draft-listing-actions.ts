"use server";

// Powers the public /list invite-link flow: a stranger arrives with no
// account, describes their site, the form fields auto-populate via Claude
// Haiku, they save the draft, and ONLY THEN do we ask for an email. The
// draft rides through signup in the encrypted iron-session cookie and gets
// materialized into a real PoweredLandListing the moment a user is created.
//
// Why this exists: traditional flow asked for an account before letting
// landowners see the form. Most bounced. Inverting the funnel — show the
// value first, ask for the email last — should significantly lift conversion
// for the buy-side sourcing engine.

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "./db";
import { getSession, type PendingLandListing } from "./session";
import { extractListingFromText, type ExtractedListing } from "./ai-extract";

// Input parser for /list — same field set as the authenticated land
// listing schema, but EVERY field is optional. We let users save partial
// drafts so they can come back to it after signing up. Coerce empty
// strings → undefined so the optStr helper in listing-actions logic plays nice.
const optStr = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));
const optNum = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().optional(),
);

const draftSchema = z.object({
  title: optStr,
  location: optStr,
  country: optStr,
  state: optStr,
  county: optStr,
  acres: optNum,
  availableMW: optNum,
  utilityProvider: optStr,
  substationDistanceMiles: optNum,
  ppaStatus: optStr,
  ppaPricePerMWh: optNum,
  interconnectionStage: optStr,
  expectedEnergization: optStr,
  waterAvailable: optStr,
  waterSourceNotes: optStr,
  fiberAvailable: optStr,
  zoning: optStr,
  askingPrice: optNum,
  pricingModel: z
    .preprocess(
      (v) => (v === "" || v === null || v === undefined ? undefined : v),
      z.enum(["sale", "lease", "JV"]).optional(),
    )
    .transform((v) => v ?? "sale"),
  description: optStr,
});

function fdToObj(formData: FormData) {
  const o: Record<string, FormDataEntryValue | null> = {};
  for (const [k, v] of formData.entries()) o[k] = v;
  return o;
}

/**
 * AI extract for the unauthenticated /list flow. Same as
 * autoFillLandListingFromDescription but doesn't require sign-in or an
 * existing listing — returns the structured fields straight back to the
 * client component, which merges them into its local form state.
 */
export async function extractDraftFromText(
  formData: FormData,
): Promise<{ ok: true; extracted: ExtractedListing } | { ok: false; error: string }> {
  const description = String(formData.get("description") || "").trim();
  if (description.length < 20) {
    return { ok: false, error: "Add at least a couple of sentences before auto-filling." };
  }
  try {
    const extracted = await extractListingFromText(description);
    return { ok: true, extracted };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "AI extraction failed.",
    };
  }
}

/**
 * Validate the draft form, stash it in the session cookie, and bounce the
 * user to /auth/signup. The signup page renders a special banner ("Almost
 * there — create your account to publish '<title>'") and the signup action
 * later picks the draft back up and materializes it into a real listing.
 */
export async function saveDraftLandListing(formData: FormData) {
  const parsed = draftSchema.safeParse(fdToObj(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }
  const d = parsed.data;

  // We require enough to render a meaningful card on /admin: a title or
  // location, AND either acres or MW. Otherwise the listing is too thin
  // to be worth holding onto across signup.
  const titleOrLocation = (d.title || d.location || "").trim();
  if (!titleOrLocation) {
    return { error: "Add a site title or location before saving." };
  }
  if (!d.acres && !d.availableMW) {
    return { error: "Add at least acres or available MW before saving." };
  }

  // Default a presentable title if the supplier didn't write one — they can
  // edit it on the listing detail page after signup.
  const title =
    d.title ||
    `${d.acres ? `${d.acres} acres` : ""}${d.acres && d.availableMW ? " · " : ""}${
      d.availableMW ? `${d.availableMW} MW` : ""
    }${d.location ? ` · ${d.location}` : ""}${d.state ? `, ${d.state}` : ""}`;

  const draft: PendingLandListing = {
    title: title.trim() || "Powered land site",
    location: d.location || "—",
    country: d.country || "USA",
    state: d.state,
    county: d.county,
    acres: d.acres ?? 0,
    availableMW: d.availableMW ?? 0,
    utilityProvider: d.utilityProvider,
    substationDistanceMiles: d.substationDistanceMiles,
    ppaStatus: d.ppaStatus,
    ppaPricePerMWh: d.ppaPricePerMWh,
    interconnectionStage: d.interconnectionStage,
    expectedEnergization: d.expectedEnergization,
    waterAvailable: d.waterAvailable,
    waterSourceNotes: d.waterSourceNotes,
    fiberAvailable: d.fiberAvailable,
    zoning: d.zoning,
    askingPrice: d.askingPrice,
    pricingModel: d.pricingModel,
    description: d.description,
    savedAt: new Date().toISOString(),
  };

  const session = await getSession();
  session.pendingLandListing = draft;
  await session.save();

  // Bounce to signup — the page reads pendingLandListing from session and
  // renders an explanatory banner. After signup, materializeDraftLandListing
  // runs and the user lands on their new listing's detail page.
  redirect("/auth/signup?from=list");
}

/**
 * Called from inside the signup server action AFTER the user is created.
 * Reads the pending draft from the session, writes a real PoweredLandListing
 * tied to the new user, and clears the session field. Returns the listing
 * id so signup can redirect there. Returns null if there's nothing to do
 * (regular signup not coming from /list).
 */
export async function materializeDraftLandListing(
  ownerId: string,
): Promise<{ id: string } | null> {
  const session = await getSession();
  const draft = session.pendingLandListing;
  if (!draft) return null;

  const expectedDate =
    draft.expectedEnergization && !isNaN(new Date(draft.expectedEnergization).getTime())
      ? new Date(draft.expectedEnergization)
      : undefined;

  const listing = await prisma.poweredLandListing.create({
    data: {
      ownerId,
      title: draft.title,
      location: draft.location,
      country: draft.country || "USA",
      state: draft.state,
      county: draft.county,
      acres: draft.acres,
      availableMW: draft.availableMW,
      utilityProvider: draft.utilityProvider,
      substationDistanceMiles: draft.substationDistanceMiles,
      ppaStatus: draft.ppaStatus,
      ppaPricePerMWh: draft.ppaPricePerMWh,
      interconnectionStage: draft.interconnectionStage,
      expectedEnergization: expectedDate,
      waterAvailable: draft.waterAvailable,
      waterSourceNotes: draft.waterSourceNotes,
      fiberAvailable: draft.fiberAvailable,
      zoning: draft.zoning,
      askingPrice: draft.askingPrice,
      pricingModel: draft.pricingModel || "sale",
      description: draft.description,
      status: "available",
      // approvalStatus defaults to "pending" — admin still has to approve.
      visibility: "public",
    },
  });

  // Clear the in-flight draft from session — it's now a real DB record.
  session.pendingLandListing = undefined;
  await session.save();

  revalidatePath("/admin");
  return { id: listing.id };
}

