// Privacy / access-control helpers for land listings.
//
// Land listings are PRIVATE by default — only the owner and people they've
// explicitly invited (by email) can see them. Owners can flip a listing to
// "public" to publish it to the open browse marketplace; admins still need
// to approve it before it shows in the public list.
//
// The single source of truth for "can this user see this listing?" lives
// here so every page and server action stays consistent.

import { prisma } from "./db";

export type AccessUser = {
  id: string;
  email: string;
  isAdmin: boolean;
} | null;

export type LandListingAccessFields = {
  id: string;
  ownerId: string;
  visibility: string;
  approvalStatus: string;
};

/**
 * Decide whether `user` can VIEW the given land listing.
 *
 * Order of checks (cheapest first — keep this fast, it's called on every
 * detail-page render):
 *   1. Owner — always sees their own listing, in any state.
 *   2. Admin — always sees, even pending/private/rejected.
 *   3. Public + approved — anyone signed in can see.
 *   4. Private — only signed-in users whose email matches an active invite.
 *
 * Returns `true` for "can view". Caller decides whether to 404, 403, or
 * redirect to /auth/signin based on whether the user is signed in.
 */
export async function canViewLandListing(
  listing: LandListingAccessFields,
  user: AccessUser,
): Promise<boolean> {
  if (!user) {
    // Unsigned-in users never see anything — even public listings need an
    // account on this marketplace because of the MNDA flow.
    return false;
  }
  if (user.id === listing.ownerId) return true;
  if (user.isAdmin) return true;

  if (listing.visibility === "public" && listing.approvalStatus === "approved") {
    return true;
  }

  // Private listing — must have an active (non-revoked) invite for this email.
  // We don't require invite.status === "accepted" for read access; clicking
  // the email link is enough to gain access, accepting just timestamps it
  // and surfaces the listing in the dashboard.
  const invite = await prisma.listingInvite.findFirst({
    where: {
      landListingId: listing.id,
      email: user.email.toLowerCase(),
      status: { not: "revoked" },
    },
    select: { id: true },
  });
  return !!invite;
}

/**
 * Build a Prisma `where` clause that selects only land listings this user
 * is allowed to see in the BROWSE list. Used by `/listings/land` and the
 * dashboard's shared-with-me section.
 *
 * Returns three OR'd shapes: own + (admin → all) | public+approved | invited.
 * If the user is null, returns a clause that matches nothing (no leakage).
 */
export function landListingsVisibleToWhere(user: AccessUser) {
  if (!user) {
    // Match nothing — never leak listings to anonymous traffic.
    return { id: "__no_anonymous_access__" };
  }
  if (user.isAdmin) {
    // Admins see everything in browse.
    return {};
  }
  return {
    OR: [
      { ownerId: user.id },
      {
        AND: [
          { visibility: "public" },
          { approvalStatus: "approved" },
          { status: "available" },
        ],
      },
      {
        invites: {
          some: {
            email: user.email.toLowerCase(),
            status: { not: "revoked" },
          },
        },
      },
    ],
  };
}
