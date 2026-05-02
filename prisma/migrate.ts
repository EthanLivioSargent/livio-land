/**
 * Post-deploy idempotent migration. Runs as part of the Railway build pipeline
 * after `prisma db push`. Safe to run repeatedly.
 *
 * - Marks existing listings as approved (so the new admin-approval workflow
 *   doesn't make production listings disappear when the column is added).
 * - Bootstraps Ethan and Nav as admins.
 * - Deletes the original demo listings owned by seed users so we go to market
 *   with an empty catalog instead of fake stand-in data.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Admin emails — these accounts always have isAdmin=true after a deploy.
const ADMIN_EMAILS = [
  "ethan@golivio.com",
  "navneet@golivio.com",
  "nav@golivio.com",
];

// Bootstrap password for the primary admin account. Idempotently reset on
// every deploy so we always know how to log in. Change this and redeploy
// to rotate.
const PRIMARY_ADMIN_EMAIL = "ethan@golivio.com";
const PRIMARY_ADMIN_PASSWORD = "GoLivio2026$";
const PRIMARY_ADMIN_NAME = "Ethan Sargent";
const PRIMARY_ADMIN_COMPANY = "Livio";

// Anything owned by these accounts is demo / seeded data and should be removed.
// The accounts themselves stay (used for QA), but their listings + Q&A go away.
const DEMO_SUPPLIER_EMAILS = [
  "ops@northstar-dc.com",
  "land@texasgrid.com",
  "deals@cascadepower.com",
];

async function main() {
  console.log("→ Running post-deploy migrations...");

  // 0. Normalize all stored emails to lowercase. Fixes the bug where a user
  //    signed up as "Ethan@golivio.com" couldn't sign back in because the
  //    DB lookup was case-sensitive but the form preserved the user's casing.
  //    Going forward auth-actions.ts lowercases on both signup and signin,
  //    so this only runs work on legacy mixed-case rows.
  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true },
  });
  let lowercased = 0;
  for (const u of allUsers) {
    const lower = u.email.trim().toLowerCase();
    if (lower !== u.email) {
      // Skip if a lowercase version already exists (would violate unique).
      const collision = await prisma.user.findUnique({ where: { email: lower } });
      if (collision && collision.id !== u.id) {
        console.warn(`  ⚠ Email collision on ${u.email} → ${lower}, skipping`);
        continue;
      }
      await prisma.user.update({ where: { id: u.id }, data: { email: lower } });
      lowercased++;
    }
  }
  if (lowercased > 0) {
    console.log(`  ✓ Lowercased ${lowercased} email addresses`);
  }

  // 1. Backfill: any DC/Land listing created before approvalStatus existed will
  //    have approvalStatus="pending" (the schema default). Auto-approve those
  //    so the public site still shows them. NEW listings created after this
  //    deploy will go in as pending and require admin review.
  // The placeholder title used by /listings/new/{dc,land} when pre-creating
  // a draft listing. Drafts with this title were never finished by the user,
  // so they MUST NOT be auto-approved (otherwise they'd surface in browse
  // with title="(Draft listing — replace this title)" and 0 MW).
  const DRAFT_TITLE = "(Draft listing — replace this title)";

  // Land-only pivot — Livio Land has retired DC capacity listings entirely.
  // Delete every DC listing so the DB matches what the UI now shows. Cascade
  // handles related Q&A, photos, messages. Idempotent — runs every deploy
  // but does no work once the table is empty.
  const dcWipe = await prisma.dataCenterListing.deleteMany({});
  if (dcWipe.count > 0) {
    console.log(`  ✓ Deleted ${dcWipe.count} retired DC listings`);
  }

  // Backfill: revert any draft-placeholder land listings that an earlier
  // deploy accidentally auto-approved, so they don't keep showing in browse
  // with 0 MW.
  const cleanupLand = await prisma.poweredLandListing.updateMany({
    where: { approvalStatus: "approved", title: DRAFT_TITLE },
    data: { approvalStatus: "pending", approvedAt: null },
  });
  if (cleanupLand.count > 0) {
    console.log(
      `  ✓ Demoted ${cleanupLand.count} placeholder land drafts back to pending`,
    );
  }

  // Auto-approve any pre-existing land listings (older than 1 hour, with
  // non-placeholder data) so the public site doesn't suddenly hide real
  // listings after the approvalStatus column was added.
  const landUnreviewed = await prisma.poweredLandListing.findMany({
    where: { approvalStatus: "pending", approvedAt: null },
    select: { id: true, createdAt: true, title: true, availableMW: true },
  });
  if (landUnreviewed.length > 0) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const idsToApprove = landUnreviewed
      .filter((l) => l.createdAt < oneHourAgo)
      .filter((l) => l.title !== DRAFT_TITLE)
      .filter((l) => l.availableMW > 0)
      .map((l) => l.id);
    if (idsToApprove.length > 0) {
      const r = await prisma.poweredLandListing.updateMany({
        where: { id: { in: idsToApprove } },
        data: { approvalStatus: "approved", approvedAt: new Date() },
      });
      console.log(`  ✓ Auto-approved ${r.count} pre-existing land listings`);
    }
  }

  // 2. Ensure the primary admin account exists with the bootstrap password.
  //    Force-reset password every deploy so we always have a working admin login,
  //    and grant MNDA-signed status so admins skip the gate.
  {
    const passwordHash = await bcrypt.hash(PRIMARY_ADMIN_PASSWORD, 10);
    await prisma.user.upsert({
      where: { email: PRIMARY_ADMIN_EMAIL },
      update: {
        passwordHash,
        isAdmin: true,
        name: PRIMARY_ADMIN_NAME,
        company: PRIMARY_ADMIN_COMPANY,
      },
      create: {
        email: PRIMARY_ADMIN_EMAIL,
        passwordHash,
        name: PRIMARY_ADMIN_NAME,
        company: PRIMARY_ADMIN_COMPANY,
        role: "both",
        isAdmin: true,
      },
    });
    console.log(`  ✓ Bootstrapped primary admin ${PRIMARY_ADMIN_EMAIL} with fresh password hash`);
  }

  // 3. Promote any other admin emails (idempotent — only runs UPDATE if isAdmin=false).
  for (const email of ADMIN_EMAILS) {
    if (email === PRIMARY_ADMIN_EMAIL) continue; // already handled above
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, isAdmin: true },
    });
    if (user && !user.isAdmin) {
      await prisma.user.update({ where: { id: user.id }, data: { isAdmin: true } });
      console.log(`  ✓ Promoted ${email} to admin`);
    }
  }

  // 3. Seed realistic demo land listings so /listings/land has supply for
  //    AI-data-center buyers to browse. Each demo listing is approved, public
  //    visibility, and owned by one of the demo seed accounts. Idempotent —
  //    we re-create only the ones missing by exact title match.
  await seedDemoLandListings();

  console.log("✓ Migrations complete");
}

// Demo land listings seeded on every deploy (idempotent — won't recreate
// ones that already exist). Lets AI data center buyers see real-looking
// supply on /listings/land instead of an empty marketplace. Owned by demo
// seed accounts so admins can identify and prune them later if needed.
const DEMO_LAND_LISTINGS = [
  {
    title: "240 acres · Pinal County, AZ · 75 MW · LGIA executed",
    location: "Casa Grande",
    state: "AZ",
    county: "Pinal",
    acres: 240,
    availableMW: 75,
    utilityProvider: "Arizona Public Service (APS)",
    substationDistanceMiles: 1.8,
    ppaStatus: "signed",
    ppaPricePerMWh: 42,
    interconnectionStage: "LGIA",
    waterAvailable: "yes",
    fiberAvailable: "yes",
    zoning: "Light industrial",
    askingPrice: 7_500_000,
    pricingModel: "sale",
    description:
      "Utility-ready parcel near Casa Grande with signed APS PPA at $42/MWh and LGIA executed in Q1. Substation is 1.8 miles east of the site boundary. Light industrial zoning, fiber on site, no water restrictions. Open to outright sale or JV with off-taker.",
    ownerEmail: DEMO_SUPPLIER_EMAILS[0],
  },
  {
    title: "320 acres · Tom Green County, TX · 100 MW · ERCOT West",
    location: "San Angelo",
    state: "TX",
    county: "Tom Green",
    acres: 320,
    availableMW: 100,
    utilityProvider: "Oncor / ERCOT West",
    substationDistanceMiles: 0.6,
    ppaStatus: "signed",
    ppaPricePerMWh: 38,
    interconnectionStage: "LGIA",
    waterAvailable: "yes",
    waterSourceNotes: "Water rights for 800 acre-feet/year",
    fiberAvailable: "yes",
    zoning: "Heavy industrial",
    askingPrice: 9_000_000,
    pricingModel: "sale",
    description:
      "320-acre parcel in ERCOT West with signed PPA at $38/MWh and 100 MW deliverable today. LGIA executed Q1 2026. Heavy-industrial zoning with municipal water rights for 800 acre-feet/year and on-site fiber. Open to long-term ground lease.",
    ownerEmail: DEMO_SUPPLIER_EMAILS[1],
  },
  {
    title: "480 acres · Loudoun County, VA · 200 MW · PJM/Dominion",
    location: "Leesburg",
    state: "VA",
    county: "Loudoun",
    acres: 480,
    availableMW: 200,
    utilityProvider: "Dominion Energy / PJM",
    substationDistanceMiles: 2.4,
    ppaStatus: "in-negotiation",
    ppaPricePerMWh: 52,
    interconnectionStage: "facility-study",
    waterAvailable: "limited",
    fiberAvailable: "yes",
    zoning: "Data center overlay",
    askingPrice: 32_000_000,
    pricingModel: "sale",
    description:
      "Strategic 480-acre Loudoun County parcel in PJM with facility-study complete. PPA negotiation in progress at ~$52/MWh. Site has data-center overlay zoning, multiple fiber providers, and limited but viable water access. Two off-takers under NDA.",
    ownerEmail: DEMO_SUPPLIER_EMAILS[2],
  },
  {
    title: "180 acres · Sweetwater County, WY · 60 MW · PacifiCorp",
    location: "Rock Springs",
    state: "WY",
    county: "Sweetwater",
    acres: 180,
    availableMW: 60,
    utilityProvider: "PacifiCorp",
    substationDistanceMiles: 3.2,
    ppaStatus: "available",
    ppaPricePerMWh: 34,
    interconnectionStage: "facility-study",
    waterAvailable: "yes",
    fiberAvailable: "near",
    zoning: "Industrial",
    askingPrice: 4_200_000,
    pricingModel: "sale",
    description:
      "Cold-climate site in Sweetwater County, WY — ideal for high-density AI compute with low cooling cost. PacifiCorp service area, facility study in progress, PPA available at indicative $34/MWh. Fiber 1.5 miles from site, water from Green River Basin allocations.",
    ownerEmail: DEMO_SUPPLIER_EMAILS[0],
  },
  {
    title: "160 acres · Fayette County, IA · 50 MW · MISO",
    location: "Oelwein",
    state: "IA",
    county: "Fayette",
    acres: 160,
    availableMW: 50,
    utilityProvider: "Alliant Energy / MISO",
    substationDistanceMiles: 1.1,
    ppaStatus: "in-negotiation",
    ppaPricePerMWh: 36,
    interconnectionStage: "study",
    waterAvailable: "yes",
    fiberAvailable: "yes",
    zoning: "Agricultural (rezoning supported by county)",
    askingPrice: 2_400_000,
    pricingModel: "sale",
    description:
      "Greenfield site in eastern Iowa MISO. Substation 1.1 miles away, study underway, PPA in negotiation. County board has indicated support for rezoning to industrial. Fiber on site. Excellent fit for 30–50 MW deployment.",
    ownerEmail: DEMO_SUPPLIER_EMAILS[1],
  },
  {
    title: "360 acres · Yakima County, WA · 120 MW · BPA",
    location: "Sunnyside",
    state: "WA",
    county: "Yakima",
    acres: 360,
    availableMW: 120,
    utilityProvider: "Bonneville Power Administration",
    substationDistanceMiles: 0.9,
    ppaStatus: "signed",
    ppaPricePerMWh: 35,
    interconnectionStage: "energized",
    waterAvailable: "yes",
    fiberAvailable: "yes",
    zoning: "Industrial",
    askingPrice: 14_000_000,
    pricingModel: "sale",
    description:
      "Energized 360-acre site in BPA service territory, signed PPA at $35/MWh. Existing 120 MW interconnection — operator can begin construction immediately. On-site fiber and Yakima Basin water rights included. Available for sale or 30+ year ground lease.",
    ownerEmail: DEMO_SUPPLIER_EMAILS[2],
  },
];

async function seedDemoLandListings() {
  // Make sure the demo seller accounts exist (with placeholder password hashes).
  const bcryptModule = await import("bcryptjs");
  const placeholderHash = await bcryptModule.default.hash(
    "demo-account-disabled",
    10,
  );
  const sellerNames: Record<string, { name: string; company: string }> = {
    "ops@northstar-dc.com": {
      name: "Northstar DC Operations",
      company: "Northstar Energy Capital",
    },
    "land@texasgrid.com": {
      name: "Texas Grid Land Group",
      company: "TexasGrid Land Co.",
    },
    "deals@cascadepower.com": {
      name: "Cascade Power Deal Team",
      company: "Cascade Power Holdings",
    },
  };
  for (const email of DEMO_SUPPLIER_EMAILS) {
    const profile = sellerNames[email];
    if (!profile) continue;
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: placeholderHash,
        name: profile.name,
        company: profile.company,
        role: "supplier",
        // Pre-mark as having signed v2 MNDA so the demo listings can be
        // posted/approved without going through the gate.
        mndaSignedAt: new Date(),
        mndaSignedVersion: "v2",
      },
    });
  }

  // Map demo email → owner id for FK lookups.
  const owners = await prisma.user.findMany({
    where: { email: { in: DEMO_SUPPLIER_EMAILS } },
    select: { id: true, email: true },
  });
  const ownerIdByEmail = Object.fromEntries(owners.map((o) => [o.email, o.id]));

  let createdCount = 0;
  for (const demo of DEMO_LAND_LISTINGS) {
    const ownerId = ownerIdByEmail[demo.ownerEmail];
    if (!ownerId) continue;
    // Idempotent: skip if a listing with the exact title already exists.
    const existing = await prisma.poweredLandListing.findFirst({
      where: { title: demo.title },
      select: { id: true },
    });
    if (existing) continue;

    const { ownerEmail: _ownerEmail, ...listingData } = demo;
    await prisma.poweredLandListing.create({
      data: {
        ...listingData,
        country: "USA",
        ownerId,
        status: "available",
        // Demo listings ship as approved + public so AI data center buyers
        // can browse them immediately without admin action.
        approvalStatus: "approved",
        approvedAt: new Date(),
        visibility: "public",
      },
    });
    createdCount++;
  }
  if (createdCount > 0) {
    console.log(`  ✓ Seeded ${createdCount} demo land listings`);
  }
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
