import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "./db";

export interface SessionData {
  userId?: string;
  email?: string;
  name?: string;
  // In-flight land listing from the public /list flow. A stranger fills the
  // describe-your-site form WITHOUT an account, we stash the structured fields
  // here in the encrypted iron-session cookie, then we materialize a real
  // PoweredLandListing the moment they sign up. See src/lib/draft-listing-actions.ts.
  pendingLandListing?: PendingLandListing;
}

/**
 * Schema for the cookie-stashed listing draft. All fields optional except the
 * required ones (title/location/acres/availableMW) so that even a partial
 * description can still be persisted while the user is making up their mind.
 */
export interface PendingLandListing {
  title: string;
  location: string;
  country?: string;
  state?: string;
  county?: string;
  acres: number;
  availableMW: number;
  utilityProvider?: string;
  substationDistanceMiles?: number;
  ppaStatus?: string;
  ppaPricePerMWh?: number;
  interconnectionStage?: string;
  expectedEnergization?: string; // ISO YYYY-MM-DD
  waterAvailable?: string;
  waterSourceNotes?: string;
  fiberAvailable?: string;
  zoning?: string;
  askingPrice?: number;
  pricingModel?: "sale" | "lease" | "JV";
  description?: string;
  // Set when the draft was last saved, so we can prune stale ones if needed.
  savedAt: string;
}

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_PASSWORD ||
    "dev-only-change-me-in-production-min-32-chars-long",
  cookieName: "livio-land-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      company: true,
      isAdmin: true,
      profilePhotoKey: true,
    },
  });
  return user;
}
