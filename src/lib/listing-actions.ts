"use server";

import { z } from "zod";
import { prisma } from "./db";
import { getCurrentUser } from "./session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sendEmail as _sendEmail } from "./email";

// Helpers
const optStr = z
  .string()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));
const optNum = z
  .preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
    z.number().optional()
  );
const reqNum = z.preprocess((v) => Number(v), z.number());
const reqDate = z.preprocess((v) => new Date(String(v)), z.date());
const optDate = z.preprocess(
  (v) => (v ? new Date(String(v)) : undefined),
  z.date().optional()
);

const dcSchema = z.object({
  title: z.string().min(3),
  location: z.string().min(2),
  country: z.string().default("USA"),
  streetAddress: optStr,
  county: optStr,
  state: optStr,
  postalCode: optStr,
  latitude: optNum,
  longitude: optNum,
  totalCapacityMW: reqNum,
  availableMW: reqNum,
  availabilityDate: reqDate,
  ratePerKWh: optNum,
  pricingModel: z.enum(["per-kWh", "per-kW-month", "custom"]).default("per-kWh"),
  contractMinYears: optNum,
  tier: optStr,
  pue: optNum,
  coolingType: optStr,
  powerDensityKWPerRack: optNum,
  network: optStr,
  certifications: optStr,
  description: optStr,
});

const landSchema = z.object({
  title: z.string().min(3),
  location: z.string().min(2),
  country: z.string().default("USA"),
  streetAddress: optStr,
  county: optStr,
  state: optStr,
  postalCode: optStr,
  latitude: optNum,
  longitude: optNum,
  acres: reqNum,
  availableMW: reqNum,
  utilityProvider: optStr,
  substationDistanceMiles: optNum,
  ppaStatus: optStr,
  ppaPricePerMWh: optNum,
  interconnectionStage: optStr,
  expectedEnergization: optDate,
  waterAvailable: optStr,
  waterSourceNotes: optStr,
  fiberAvailable: optStr,
  zoning: optStr,
  askingPrice: optNum,
  pricingModel: z.enum(["sale", "lease", "JV"]).default("sale"),
  description: optStr,
});

function fd(formData: FormData) {
  const data: Record<string, FormDataEntryValue | null> = {};
  for (const [k, v] of formData.entries()) data[k] = v;
  return data;
}

export async function createDcListing(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const parsed = dcSchema.safeParse(fd(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }
  const listing = await prisma.dataCenterListing.create({
    data: { ...parsed.data, ownerId: user.id },
  });
  revalidatePath("/listings/dc");
  // Send the user to the edit page so they can add photos and any final
  // details before the listing is reviewed by an admin.
  redirect(`/listings/dc/${listing.id}/edit?fresh=1`);
}

export async function createLandListing(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const parsed = landSchema.safeParse(fd(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }
  const listing = await prisma.poweredLandListing.create({
    data: { ...parsed.data, ownerId: user.id },
  });
  revalidatePath("/listings/land");
  redirect(`/listings/land/${listing.id}/edit?fresh=1`);
}

export async function updateDcListing(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const listing = await prisma.dataCenterListing.findUnique({ where: { id } });
  if (!listing) return { error: "Listing not found" };
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return { error: "Not allowed — only the owner or an admin can edit this listing" };
  }
  const parsed = dcSchema.safeParse(fd(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }
  await prisma.dataCenterListing.update({
    where: { id },
    data: parsed.data,
  });
  revalidatePath(`/listings/dc/${id}`);
  revalidatePath("/listings/dc");
  redirect(`/listings/dc/${id}`);
}

export async function updateLandListing(id: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const listing = await prisma.poweredLandListing.findUnique({ where: { id } });
  if (!listing) return { error: "Listing not found" };
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return { error: "Not allowed — only the owner or an admin can edit this listing" };
  }
  const parsed = landSchema.safeParse(fd(formData));
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid input" };
  }
  await prisma.poweredLandListing.update({
    where: { id },
    data: parsed.data,
  });
  revalidatePath(`/listings/land/${id}`);
  revalidatePath("/listings/land");
  redirect(`/listings/land/${id}`);
}

export async function deleteDcListing(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const listing = await prisma.dataCenterListing.findUnique({ where: { id } });
  if (!listing) return { error: "Not found" };
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return { error: "Not allowed" };
  }
  await prisma.dataCenterListing.delete({ where: { id } });
  revalidatePath("/listings/dc");
  revalidatePath("/dashboard");
  redirect("/listings/dc");
}

export async function deleteLandListing(id: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const listing = await prisma.poweredLandListing.findUnique({ where: { id } });
  if (!listing) return { error: "Not found" };
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return { error: "Not allowed" };
  }
  await prisma.poweredLandListing.delete({ where: { id } });
  revalidatePath("/listings/land");
  revalidatePath("/dashboard");
  redirect("/listings/land");
}

// "Describe your site" → AI extraction.
// Supplier pastes a free-text description; Claude Haiku 4.5 pulls structured
// fields (location, MW, acres, PPA status, etc.) and we overwrite ONLY the
// blank fields on the draft. Anything the supplier already filled in stays
// untouched. The supplier reviews the result before clicking Save.
export async function autoFillLandListingFromDescription(
  id: string,
  formData: FormData,
): Promise<{ ok: true; filled: string[] } | { ok: false; error: string }> {
  const { extractListingFromText } = await import("./ai-extract");
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  const listing = await prisma.poweredLandListing.findUnique({ where: { id } });
  if (!listing) return { ok: false, error: "Listing not found" };
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return { ok: false, error: "Only the listing owner or an admin can edit this listing." };
  }
  const description = String(formData.get("description") || "").trim();
  if (description.length < 20) {
    return { ok: false, error: "Add at least a couple of sentences before auto-filling." };
  }

  const extracted = await extractListingFromText(description);

  // Build an update payload that only fills BLANK fields. We never overwrite
  // values the supplier already typed in — this lets them refine the draft
  // by editing the description and re-running extraction without losing work.
  const data: Record<string, string | number | Date | null> = {};
  const filled: string[] = [];
  const setIfBlank = (
    key: keyof typeof listing,
    value: string | number | Date | null | undefined,
  ) => {
    if (value === undefined || value === null) return;
    const current = (listing as Record<string, unknown>)[key];
    const isBlank =
      current === null ||
      current === undefined ||
      current === "" ||
      current === 0 ||
      current === "(Draft listing — replace this title)";
    if (isBlank) {
      data[key as string] = value as string | number | Date;
      filled.push(key as string);
    }
  };

  setIfBlank("title", extracted.title);
  setIfBlank("description", extracted.description ?? description);
  setIfBlank("location", extracted.location);
  setIfBlank("state", extracted.state);
  setIfBlank("county", extracted.county);
  setIfBlank("country", extracted.country ?? "USA");
  setIfBlank("acres", extracted.acres);
  setIfBlank("availableMW", extracted.availableMW);
  setIfBlank("utilityProvider", extracted.utilityProvider);
  setIfBlank("substationDistanceMiles", extracted.substationDistanceMiles);
  setIfBlank("ppaStatus", extracted.ppaStatus);
  setIfBlank("ppaPricePerMWh", extracted.ppaPricePerMWh);
  setIfBlank("interconnectionStage", extracted.interconnectionStage);
  if (extracted.expectedEnergization) {
    const d = new Date(extracted.expectedEnergization);
    if (!isNaN(d.getTime())) setIfBlank("expectedEnergization", d);
  }
  setIfBlank("waterAvailable", extracted.waterAvailable);
  setIfBlank("waterSourceNotes", extracted.waterSourceNotes);
  setIfBlank("fiberAvailable", extracted.fiberAvailable);
  setIfBlank("zoning", extracted.zoning);
  setIfBlank("askingPrice", extracted.askingPrice);
  setIfBlank("pricingModel", extracted.pricingModel);

  if (Object.keys(data).length > 0) {
    await prisma.poweredLandListing.update({ where: { id }, data });
  }
  revalidatePath(`/listings/land/${id}/edit`);
  return { ok: true, filled };
}

// Toggle whether a single land-listing field is hidden from public viewers.
// Called by the eye-with-slash button next to each form field. Owner-only.
export async function toggleLandFieldPrivacy(
  id: string,
  fieldName: string,
): Promise<{ ok: true; private: boolean } | { ok: false; error: string }> {
  const { isToggleableField } = await import("./listing-privacy");
  if (!isToggleableField(fieldName)) {
    return { ok: false, error: "Field is not togglable." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in first." };
  const listing = await prisma.poweredLandListing.findUnique({ where: { id } });
  if (!listing) return { ok: false, error: "Listing not found" };
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return { ok: false, error: "Only the owner or an admin can change privacy." };
  }
  const current = listing.privateFields || [];
  const wasPrivate = current.includes(fieldName);
  const next = wasPrivate
    ? current.filter((f) => f !== fieldName)
    : [...current, fieldName];
  await prisma.poweredLandListing.update({
    where: { id },
    data: { privateFields: next },
  });
  revalidatePath(`/listings/land/${id}`);
  revalidatePath(`/listings/land/${id}/edit`);
  return { ok: true, private: !wasPrivate };
}

// "Post listing" — owner explicit submission for admin review.
// The listing already enters approvalStatus="pending" the moment it's saved,
// so this action mainly (a) bumps updatedAt so admins see freshly-submitted
// listings at the top of the queue and (b) drops the user on a confirmation
// page so they know it's been submitted. Already-approved listings are no-ops.
//
// These are wired into <form action={...}> on the detail pages, so the return
// type must be void | Promise<void> — we throw on permission errors instead
// of returning { error }.
export async function postDcListing(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const listing = await prisma.dataCenterListing.findUnique({ where: { id } });
  if (!listing) throw new Error("Listing not found");
  if (listing.ownerId !== user.id && !user.isAdmin) {
    throw new Error("Only the listing owner or an admin can post this listing.");
  }
  if (listing.approvalStatus === "pending") {
    await prisma.dataCenterListing.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }
  revalidatePath(`/listings/dc/${id}`);
  redirect(`/listings/dc/${id}?posted=1`);
}

export async function postLandListing(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const listing = await prisma.poweredLandListing.findUnique({ where: { id } });
  if (!listing) throw new Error("Listing not found");
  if (listing.ownerId !== user.id && !user.isAdmin) {
    throw new Error("Only the listing owner or an admin can post this listing.");
  }
  if (listing.approvalStatus === "pending") {
    await prisma.poweredLandListing.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }
  revalidatePath(`/listings/land/${id}`);
  redirect(`/listings/land/${id}?posted=1`);
}

// Q&A
export async function askQuestion(
  listingType: "dc" | "land",
  listingId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const body = String(formData.get("body") || "").trim();
  if (body.length < 3) return { error: "Question is too short" };
  await prisma.question.create({
    data: {
      body,
      askerId: user.id,
      ...(listingType === "dc"
        ? { dcListingId: listingId }
        : { landListingId: listingId }),
    },
  });
  revalidatePath(`/listings/${listingType}/${listingId}`);
}

export async function answerQuestion(
  listingType: "dc" | "land",
  listingId: string,
  questionId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const body = String(formData.get("body") || "").trim();
  if (body.length < 1) return { error: "Answer cannot be empty" };
  await prisma.answer.create({
    data: { body, questionId, responderId: user.id },
  });
  revalidatePath(`/listings/${listingType}/${listingId}`);
}

// --- Messaging ---
export async function sendMessage(
  listingType: "dc" | "land",
  listingId: string,
  formData: FormData
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  const body = String(formData.get("body") || "").trim();
  if (body.length < 5) {
    return { error: "Message is too short" };
  }
  if (body.length > 4000) {
    return { error: "Message is too long" };
  }

  const listing =
    listingType === "dc"
      ? await prisma.dataCenterListing.findUnique({
          where: { id: listingId },
          include: { owner: { select: { id: true, email: true, name: true } } },
        })
      : await prisma.poweredLandListing.findUnique({
          where: { id: listingId },
          include: { owner: { select: { id: true, email: true, name: true } } },
        });

  if (!listing) return { error: "Listing not found" };
  if (listing.ownerId === user.id) {
    return { error: "You can't message yourself on your own listing" };
  }

  const msg = await prisma.message.create({
    data: {
      body,
      senderId: user.id,
      recipientId: listing.ownerId,
      ...(listingType === "dc"
        ? { dcListingId: listingId }
        : { landListingId: listingId }),
    },
  });

  // Build the listing URL for the email (best-effort; defaults to relative)
  const base =
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : "";
  const listingUrl = `${base}/listings/${listingType}/${listingId}`;
  const inboxUrl = `${base}/inbox`;
  const senderLabel =
    user.company ? `${user.name} (${user.company})` : user.name;

  await _sendEmail({
    to: listing.owner.email,
    subject: `New message about "${listing.title}" — Livio Land`,
    html: `
      <div style="font-family: -apple-system, Helvetica, sans-serif; max-width: 560px; margin: auto; color: #0f172a;">
        <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px;">New message from ${senderLabel}</h2>
        <p style="font-size: 14px; color: #475569; margin: 0 0 16px;">
          About your listing: <a href="${listingUrl}" style="color: #0284c7;">${listing.title}</a>
        </p>
        <div style="border-left: 3px solid #0284c7; padding: 12px 16px; background: #f8fafc; border-radius: 4px; white-space: pre-wrap; font-size: 15px;">
          ${body.replace(/&/g,"&amp;").replace(/</g,"&lt;")}
        </div>
        <p style="margin: 24px 0 0; font-size: 13px; color: #64748b;">
          Reply directly via your <a href="${inboxUrl}" style="color: #0284c7;">Livio Land inbox</a>.
        </p>
      </div>
    `,
  });

  revalidatePath(`/listings/${listingType}/${listingId}`);
  return { ok: true, messageId: msg.id };
}

export async function markMessageRead(messageId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");
  await prisma.message.updateMany({
    where: { id: messageId, recipientId: user.id },
    data: { read: true },
  });
  revalidatePath("/inbox");
}
