// Pre-create a draft DC listing and redirect to the edit page (which has
// photo upload, full fields, and the "Pending review" banner). Suppliers can
// upload facility photos AS PART of creation, not after.
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const DRAFT_TITLE = "(Draft listing — replace this title)";

export default async function NewDcListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin?next=/listings/new/dc");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingDraft = await prisma.dataCenterListing.findFirst({
    where: {
      ownerId: user.id,
      title: DRAFT_TITLE,
      createdAt: { gt: oneDayAgo },
      approvalStatus: "pending",
    },
    orderBy: { createdAt: "desc" },
  });
  if (existingDraft) {
    redirect(`/listings/dc/${existingDraft.id}/edit?fresh=1`);
  }

  const draft = await prisma.dataCenterListing.create({
    data: {
      ownerId: user.id,
      title: DRAFT_TITLE,
      location: "",
      country: "USA",
      totalCapacityMW: 0,
      availableMW: 0,
      availabilityDate: new Date(),
      pricingModel: "per-kWh",
      status: "available",
    },
  });
  redirect(`/listings/dc/${draft.id}/edit?fresh=1`);
}
