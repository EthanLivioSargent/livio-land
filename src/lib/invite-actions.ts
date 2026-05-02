"use server";

// Invite server actions. Wraps email + DB writes so the listing detail page
// can stay a clean RSC. All writes are scoped to the listing owner — the
// same authorization check runs at the top of every action.

import { z } from "zod";
import { prisma } from "./db";
import { getCurrentUser } from "./session";
import { sendEmail } from "./email";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const emailSchema = z
  .string()
  .min(3)
  .max(254)
  .email()
  .transform((v) => v.trim().toLowerCase());

const inviteSchema = z.object({
  email: emailSchema,
  // Free-text note that gets dropped into the invite email body. Optional;
  // we cap length so it can't be used to smuggle a giant phishing payload.
  message: z
    .string()
    .max(1000)
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined)),
});

function publicBaseUrl() {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return "";
}

/**
 * Owner sends an invite to a single email for one of THEIR land listings.
 * - Auth: must be signed in AND own the listing (or be admin).
 * - Idempotency: if there's already a non-revoked invite for that email on
 *   this listing, we re-send the email but reuse the existing token so the
 *   recipient's old invite link keeps working.
 * - Email delivery: via Resend if configured (lib/email). Logs only otherwise.
 */
export async function inviteEmailToListing(listingId: string, formData: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message || "Invalid email" };
  }

  const listing = await prisma.poweredLandListing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true, title: true, location: true },
  });
  if (!listing) return { error: "Listing not found" };
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return { error: "Only the listing owner can send invites." };
  }

  // Don't let owners email-invite themselves — they already have access
  // and we'd just clutter their inbox.
  if (parsed.data.email === user.email.toLowerCase()) {
    return { error: "You already have access to your own listing." };
  }

  // Look for an existing active invite to this email. Reuse the token if
  // we find one so re-sending doesn't break the recipient's old link.
  const existing = await prisma.listingInvite.findFirst({
    where: {
      landListingId: listingId,
      email: parsed.data.email,
      status: { not: "revoked" },
    },
  });

  const invite = existing
    ? await prisma.listingInvite.update({
        where: { id: existing.id },
        data: {
          message: parsed.data.message ?? existing.message,
          // Re-arm any previously revoked invite (covered by status filter
          // above so we won't hit this branch in practice, but keep the
          // intent explicit in case the filter changes).
          status: existing.status === "revoked" ? "pending" : existing.status,
          revokedAt: null,
        },
      })
    : await prisma.listingInvite.create({
        data: {
          landListingId: listingId,
          email: parsed.data.email,
          invitedById: user.id,
          message: parsed.data.message,
        },
      });

  const base = publicBaseUrl();
  const acceptUrl = `${base}/invite/${invite.token}`;
  const inviterLabel = user.company ? `${user.name} (${user.company})` : user.name;
  const safeMsg = (parsed.data.message ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");

  await sendEmail({
    to: parsed.data.email,
    subject: `${inviterLabel} shared a Livio Land site with you: "${listing.title}"`,
    html: `
      <div style="font-family: -apple-system, Helvetica, sans-serif; max-width: 560px; margin: auto; color: #0f172a;">
        <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 12px;">
          You've been invited to view a private Livio Land site
        </h2>
        <p style="font-size: 14px; color: #475569; margin: 0 0 8px;">
          <strong>${inviterLabel}</strong> shared <strong>${listing.title}</strong>
          ${listing.location ? `(${listing.location})` : ""} with you.
        </p>
        ${
          safeMsg
            ? `<div style="border-left: 3px solid #10b981; padding: 12px 16px; background: #f0fdf4; border-radius: 4px; white-space: pre-wrap; font-size: 15px; margin: 16px 0;">${safeMsg}</div>`
            : ""
        }
        <p style="margin: 24px 0;">
          <a href="${acceptUrl}"
             style="display:inline-block; background:#059669; color:#fff; padding:12px 22px; border-radius:8px; font-weight:600; text-decoration:none;">
            View site
          </a>
        </p>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
          You'll need to sign in (or create a free account) with
          <strong>${parsed.data.email}</strong> to access this listing.
          If you weren't expecting this, you can ignore the email.
        </p>
      </div>
    `,
  });

  revalidatePath(`/listings/land/${listingId}`);
  return { ok: true, inviteId: invite.id, isNew: !existing };
}

/**
 * Owner pulls access for a previously-sent invite. Marks revoked rather
 * than deleting so we keep the audit trail of who-was-invited-when.
 */
export async function revokeInvite(inviteId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const invite = await prisma.listingInvite.findUnique({
    where: { id: inviteId },
    include: {
      landListing: { select: { id: true, ownerId: true } },
    },
  });
  if (!invite) return { error: "Invite not found" };
  if (invite.landListing.ownerId !== user.id && !user.isAdmin) {
    return { error: "Only the listing owner can revoke invites." };
  }

  await prisma.listingInvite.update({
    where: { id: inviteId },
    data: { status: "revoked", revokedAt: new Date() },
  });

  revalidatePath(`/listings/land/${invite.landListing.id}`);
  return { ok: true };
}

/**
 * Recipient lands on /invite/[token] after clicking the email link.
 * - If signed in with the invited email → mark accepted, send to listing.
 * - If signed in with a DIFFERENT email → return error so the page can
 *   tell them to sign out and use the right account.
 * - If signed out → page redirects them to signup with email pre-filled.
 *
 * This is the only place we set status="accepted"; canViewLandListing
 * uses email match alone, so accepting is just bookkeeping for the
 * dashboard "Shared with me" view.
 */
export async function acceptInviteToken(
  token: string,
): Promise<
  | { ok: true; landListingId: string }
  | { ok: false; error: string; needsSignin?: boolean; expectedEmail?: string }
> {
  const user = await getCurrentUser();
  const invite = await prisma.listingInvite.findUnique({
    where: { token },
    select: {
      id: true,
      email: true,
      status: true,
      landListingId: true,
    },
  });
  if (!invite) return { ok: false, error: "This invite link is invalid or expired." };
  if (invite.status === "revoked") {
    return { ok: false, error: "This invite has been revoked by the owner." };
  }

  if (!user) {
    return {
      ok: false,
      error: "Please sign in to accept this invite.",
      needsSignin: true,
      expectedEmail: invite.email,
    };
  }
  if (user.email.toLowerCase() !== invite.email) {
    return {
      ok: false,
      error: `This invite was sent to ${invite.email}. Sign out and sign back in with that email to accept.`,
      expectedEmail: invite.email,
    };
  }

  if (invite.status !== "accepted") {
    await prisma.listingInvite.update({
      where: { id: invite.id },
      data: {
        status: "accepted",
        acceptedAt: new Date(),
        acceptedById: user.id,
      },
    });
    revalidatePath(`/listings/land/${invite.landListingId}`);
    revalidatePath("/dashboard");
  }
  return { ok: true, landListingId: invite.landListingId };
}

/**
 * Owner-side: change a listing between "private" (default) and "public".
 * Wired to a small toggle button on the listing detail page.
 */
export async function setLandListingVisibility(
  listingId: string,
  visibility: "private" | "public",
) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin");

  const listing = await prisma.poweredLandListing.findUnique({
    where: { id: listingId },
    select: { id: true, ownerId: true },
  });
  if (!listing) return { error: "Listing not found" };
  if (listing.ownerId !== user.id && !user.isAdmin) {
    return { error: "Only the listing owner can change visibility." };
  }
  if (visibility !== "private" && visibility !== "public") {
    return { error: "Invalid visibility" };
  }

  await prisma.poweredLandListing.update({
    where: { id: listingId },
    data: { visibility },
  });
  revalidatePath(`/listings/land/${listingId}`);
  revalidatePath("/listings/land");
  return { ok: true };
}
