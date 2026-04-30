"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, getSession } from "@/lib/session";
import {
  isR2Configured,
  uploadToR2,
  deleteFromR2,
  getR2DownloadUrl,
} from "@/lib/r2";

export type ProfileResult = { ok: true; message?: string } | { ok: false; error: string };

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  company: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "New password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "New password and confirmation don't match",
    path: ["confirmPassword"],
  });

const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
  "image/heif",
]);
const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8 MB

/** Update the current user's name + company. */
export async function updateProfile(formData: FormData): Promise<ProfileResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    company: (formData.get("company") as string | null)?.trim() || undefined,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name, company: parsed.data.company || null },
  });

  // Refresh the cookie session's display name in case the user renamed themselves.
  const session = await getSession();
  session.name = parsed.data.name;
  await session.save();

  revalidatePath("/profile");
  revalidatePath("/", "layout"); // header shows name
  return { ok: true, message: "Profile updated." };
}

/** Change the current user's password. */
export async function changePassword(formData: FormData): Promise<ProfileResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const parsed = passwordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.errors[0]?.message || "Invalid input" };
  }

  // Verify the current password before swapping it.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser) return { ok: false, error: "User not found." };

  const ok = await bcrypt.compare(parsed.data.currentPassword, dbUser.passwordHash);
  if (!ok) return { ok: false, error: "Current password is incorrect." };

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash },
  });

  return { ok: true, message: "Password changed." };
}

function makeProfilePhotoKey(userId: string, originalName: string): string {
  const ext = (originalName.match(/\.[a-zA-Z0-9]+$/)?.[0] || ".jpg").toLowerCase();
  const id = randomBytes(8).toString("hex");
  return `users/${userId}/profile-${id}${ext}`;
}

/** Upload (or replace) the current user's profile photo. Stored on R2. */
export async function uploadProfilePhoto(formData: FormData): Promise<ProfileResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };
  if (!isR2Configured()) {
    return { ok: false, error: "Photo storage is not configured. Contact an admin." };
  }

  const file = formData.get("file") as File | null;
  if (!file) return { ok: false, error: "No file uploaded." };
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { ok: false, error: `Unsupported file type: ${file.type}` };
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return {
      ok: false,
      error: `Photo too large (max ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB).`,
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const key = makeProfilePhotoKey(user.id, file.name || "profile.jpg");
  await uploadToR2(key, buffer, file.type);

  // Read the previous photo key, replace it, then delete the old object (best-effort).
  const previous = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profilePhotoKey: true },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { profilePhotoKey: key },
  });
  if (previous?.profilePhotoKey && previous.profilePhotoKey !== key) {
    try {
      await deleteFromR2(previous.profilePhotoKey);
    } catch (e) {
      console.error("Failed to delete old profile photo from R2:", e);
    }
  }

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile photo updated." };
}

/** Remove the current user's profile photo entirely. */
export async function removeProfilePhoto(): Promise<ProfileResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in required." };

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { profilePhotoKey: true },
  });
  if (!dbUser?.profilePhotoKey) return { ok: true, message: "No profile photo to remove." };

  try {
    await deleteFromR2(dbUser.profilePhotoKey);
  } catch (e) {
    console.error("R2 delete failed:", e);
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { profilePhotoKey: null },
  });

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile photo removed." };
}

