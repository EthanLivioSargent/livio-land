// Pre-create a draft listing and send the user straight to the edit page
// (which has photo upload, full fields, and the "Pending review" banner).
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

const DRAFT_TITLE = "(Draft listing — replace this title)";

export default async function NewLandListingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin?next=/listings/new/land");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existingDraft = await prisma.poweredLandListing.findFirst({
    where: {
      ownerId: user.id,
      title: DRAFT_TITLE,
      createdAt: { gt: oneDayAgo },
      approvalStatus: "pending",
    },
    orderBy: { createdAt: "desc" },
  });
  if (existingDraft) {
    redirect(`/listings/land/${existingDraft.id}/edit?fresh=1`);
  }

  const draft = await prisma.poweredLandListing.create({
    data: {
      ownerId: user.id,
      title: DRAFT_TITLE,
      location: "",
      country: "USA",
      acres: 0,
      availableMW: 0,
      pricingModel: "sale",
      status: "available",
    },
  });
  redirect(`/listings/land/${draft.id}/edit?fresh=1`);
}
