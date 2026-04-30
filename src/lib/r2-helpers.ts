// Plain helper functions that wrap r2.ts. Lives outside any "use server"
// file so it can be imported and called directly from server components
// (like layout.tsx) without going through the server-action RPC pipeline.
import { isR2Configured, getR2DownloadUrl } from "@/lib/r2";

/** Server-side helper: presigned URL for a user's profile photo, or null. */
export async function getProfilePhotoUrl(profilePhotoKey: string | null): Promise<string | null> {
  if (!profilePhotoKey) return null;
  if (!isR2Configured()) return null;
  try {
    return await getR2DownloadUrl(profilePhotoKey);
  } catch {
    return null;
  }
}
