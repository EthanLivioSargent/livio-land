"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Not signed in");
  if (!user.isAdmin) throw new Error("Admin access required");
  return user;
}

export async function approveListing(
  type: "dc" | "land",
  listingId: string,
): Promise<AdminActionResult> {
  try {
    const admin = await requireAdmin();
    const data = {
      approvalStatus: "approved",
      approvedAt: new Date(),
      approvedById: admin.id,
      rejectionReason: null,
    };
    if (type === "dc") {
      await prisma.dataCenterListing.update({ where: { id: listingId }, data });
    } else {
      await prisma.poweredLandListing.update({ where: { id: listingId }, data });
    }
    revalidatePath("/admin");
    revalidatePath(`/listings/${type}`);
    revalidatePath(`/listings/${type}/${listingId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to approve" };
  }
}

export async function rejectListing(
  type: "dc" | "land",
  listingId: string,
  reason: string,
): Promise<AdminActionResult> {
  try {
    await requireAdmin();
    const trimmed = reason.trim();
    if (!trimmed) return { ok: false, error: "Rejection reason is required." };
    const data = {
      approvalStatus: "rejected",
      approvedAt: null,
      approvedById: null,
      rejectionReason: trimmed,
    };
    if (type === "dc") {
      await prisma.dataCenterListing.update({ where: { id: listingId }, data });
    } else {
      await prisma.poweredLandListing.update({ where: { id: listingId }, data });
    }
    revalidatePath("/admin");
    revalidatePath(`/listings/${type}`);
    revalidatePath(`/listings/${type}/${listingId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to reject" };
  }
}

/** Idempotently seed 6 realistic demo land listings owned by demo seller
 *  accounts. Lets admins populate the marketplace on demand instead of
 *  relying on the migration step (which has been flaky on Railway).
 *  Demo listings ship as approved + public — they show up on /listings/land
 *  immediately for AI Data Center buyers to browse. */
export async function seedDemoLandListings(): Promise<
  { ok: true; created: number } | { ok: false; error: string }
> {
  try {
    await requireAdmin();
    const bcryptModule = await import("bcryptjs");
    const placeholderHash = await bcryptModule.default.hash(
      "demo-account-disabled",
      10,
    );
    const sellers: Array<{ email: string; name: string; company: string }> = [
      { email: "ops@northstar-dc.com", name: "Northstar DC Operations", company: "Northstar Energy Capital" },
      { email: "land@texasgrid.com", name: "Texas Grid Land Group", company: "TexasGrid Land Co." },
      { email: "deals@cascadepower.com", name: "Cascade Power Deal Team", company: "Cascade Power Holdings" },
    ];
    for (const s of sellers) {
      await prisma.user.upsert({
        where: { email: s.email },
        update: {},
        create: {
          email: s.email,
          passwordHash: placeholderHash,
          name: s.name,
          company: s.company,
          role: "supplier",
          mndaSignedAt: new Date(),
          mndaSignedVersion: "v2",
        },
      });
    }
    const owners = await prisma.user.findMany({
      where: { email: { in: sellers.map((s) => s.email) } },
      select: { id: true, email: true },
    });
    const ownerIdByEmail = Object.fromEntries(owners.map((o) => [o.email, o.id]));

    const demos = [
      { title: "240 acres · Pinal County, AZ · 75 MW · LGIA executed", location: "Casa Grande", state: "AZ", county: "Pinal", acres: 240, availableMW: 75, utilityProvider: "Arizona Public Service (APS)", substationDistanceMiles: 1.8, ppaStatus: "signed", ppaPricePerMWh: 42, interconnectionStage: "LGIA", waterAvailable: "yes", fiberAvailable: "yes", zoning: "Light industrial", askingPrice: 7_500_000, pricingModel: "sale", description: "Utility-ready parcel near Casa Grande with signed APS PPA at $42/MWh and LGIA executed in Q1. Substation is 1.8 miles east of the site boundary. Light industrial zoning, fiber on site, no water restrictions. Open to outright sale or JV with off-taker.", ownerEmail: "ops@northstar-dc.com" },
      { title: "320 acres · Tom Green County, TX · 100 MW · ERCOT West", location: "San Angelo", state: "TX", county: "Tom Green", acres: 320, availableMW: 100, utilityProvider: "Oncor / ERCOT West", substationDistanceMiles: 0.6, ppaStatus: "signed", ppaPricePerMWh: 38, interconnectionStage: "LGIA", waterAvailable: "yes", waterSourceNotes: "Water rights for 800 acre-feet/year", fiberAvailable: "yes", zoning: "Heavy industrial", askingPrice: 9_000_000, pricingModel: "sale", description: "320-acre parcel in ERCOT West with signed PPA at $38/MWh and 100 MW deliverable today. LGIA executed Q1 2026. Heavy-industrial zoning with municipal water rights for 800 acre-feet/year and on-site fiber. Open to long-term ground lease.", ownerEmail: "land@texasgrid.com" },
      { title: "480 acres · Loudoun County, VA · 200 MW · PJM/Dominion", location: "Leesburg", state: "VA", county: "Loudoun", acres: 480, availableMW: 200, utilityProvider: "Dominion Energy / PJM", substationDistanceMiles: 2.4, ppaStatus: "in-negotiation", ppaPricePerMWh: 52, interconnectionStage: "facility-study", waterAvailable: "limited", fiberAvailable: "yes", zoning: "Data center overlay", askingPrice: 32_000_000, pricingModel: "sale", description: "Strategic 480-acre Loudoun County parcel in PJM with facility-study complete. PPA negotiation in progress at ~$52/MWh. Site has data-center overlay zoning, multiple fiber providers, and limited but viable water access. Two off-takers under NDA.", ownerEmail: "deals@cascadepower.com" },
      { title: "180 acres · Sweetwater County, WY · 60 MW · PacifiCorp", location: "Rock Springs", state: "WY", county: "Sweetwater", acres: 180, availableMW: 60, utilityProvider: "PacifiCorp", substationDistanceMiles: 3.2, ppaStatus: "available", ppaPricePerMWh: 34, interconnectionStage: "facility-study", waterAvailable: "yes", fiberAvailable: "near", zoning: "Industrial", askingPrice: 4_200_000, pricingModel: "sale", description: "Cold-climate site in Sweetwater County, WY — ideal for high-density AI compute with low cooling cost. PacifiCorp service area, facility study in progress, PPA available at indicative $34/MWh. Fiber 1.5 miles from site, water from Green River Basin allocations.", ownerEmail: "ops@northstar-dc.com" },
      { title: "160 acres · Fayette County, IA · 50 MW · MISO", location: "Oelwein", state: "IA", county: "Fayette", acres: 160, availableMW: 50, utilityProvider: "Alliant Energy / MISO", substationDistanceMiles: 1.1, ppaStatus: "in-negotiation", ppaPricePerMWh: 36, interconnectionStage: "study", waterAvailable: "yes", fiberAvailable: "yes", zoning: "Agricultural (rezoning supported by county)", askingPrice: 2_400_000, pricingModel: "sale", description: "Greenfield site in eastern Iowa MISO. Substation 1.1 miles away, study underway, PPA in negotiation. County board has indicated support for rezoning to industrial. Fiber on site. Excellent fit for 30–50 MW deployment.", ownerEmail: "land@texasgrid.com" },
      { title: "360 acres · Yakima County, WA · 120 MW · BPA energized", location: "Sunnyside", state: "WA", county: "Yakima", acres: 360, availableMW: 120, utilityProvider: "Bonneville Power Administration", substationDistanceMiles: 0.9, ppaStatus: "signed", ppaPricePerMWh: 35, interconnectionStage: "energized", waterAvailable: "yes", fiberAvailable: "yes", zoning: "Industrial", askingPrice: 14_000_000, pricingModel: "sale", description: "Energized 360-acre site in BPA service territory, signed PPA at $35/MWh. Existing 120 MW interconnection — operator can begin construction immediately. On-site fiber and Yakima Basin water rights included. Available for sale or 30+ year ground lease.", ownerEmail: "deals@cascadepower.com" },
    ];

    // Curated Picsum seeds — each one is a stable, real photograph from
    // Unsplash via Lorem Picsum's seeded delivery. Three shots per site
    // (cover, drone, detail) so each listing card has a real photo and the
    // detail page has a small gallery. The r2Key column stores the public URL
    // directly; getR2DownloadUrl detects http(s) and passes through.
    const PHOTO_SEEDS_BY_TITLE: Record<string, string[]> = {};
    for (const d of demos) {
      const slug = d.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 32);
      PHOTO_SEEDS_BY_TITLE[d.title] = [
        `https://picsum.photos/seed/${slug}-cover/1600/900`,
        `https://picsum.photos/seed/${slug}-drone/1600/900`,
        `https://picsum.photos/seed/${slug}-detail/1600/900`,
      ];
    }
    async function ensureDemoPhotos(listingId: string, title: string) {
      const existingCount = await prisma.listingPhoto.count({
        where: { landListingId: listingId },
      });
      if (existingCount > 0) return; // don't disturb listings that already have photos
      const urls = PHOTO_SEEDS_BY_TITLE[title] ?? [];
      for (let i = 0; i < urls.length; i++) {
        await prisma.listingPhoto.create({
          data: {
            r2Key: urls[i],
            originalName: `demo-${i + 1}.jpg`,
            contentType: "image/jpeg",
            sizeBytes: 0,
            kind: "photo",
            sortOrder: i,
            landListingId: listingId,
          },
        });
      }
    }

    let created = 0;
    for (const d of demos) {
      const ownerId = ownerIdByEmail[d.ownerEmail];
      if (!ownerId) continue;
      const existing = await prisma.poweredLandListing.findFirst({
        where: { title: d.title },
        select: { id: true },
      });
      if (existing) {
        // Listing already exists — make sure it has photos so the demo deck
        // looks right even on re-runs after photo support was added.
        await ensureDemoPhotos(existing.id, d.title);
        continue;
      }
      const { ownerEmail: _ownerEmail, ...listingData } = d;
      const newListing = await prisma.poweredLandListing.create({
        data: {
          ...listingData,
          country: "USA",
          ownerId,
          status: "available",
          approvalStatus: "approved",
          approvedAt: new Date(),
          visibility: "public",
        },
      });
      await ensureDemoPhotos(newListing.id, d.title);
      created++;
    }
    revalidatePath("/listings/land");
    revalidatePath("/admin");
    return { ok: true, created };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to seed demo listings" };
  }
}

/** Toggle a user's admin status. Used to bootstrap Nav + Ethan as admins. */
export async function setUserAdmin(email: string, isAdmin: boolean): Promise<AdminActionResult> {
  try {
    await requireAdmin();
    await prisma.user.update({ where: { email }, data: { isAdmin } });
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to update user" };
  }
}
