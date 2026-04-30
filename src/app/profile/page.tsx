import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getProfilePhotoUrl } from "@/lib/r2-helpers";
import { ProfileForm } from "./profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/signin?next=/profile");

  const photoUrl = await getProfilePhotoUrl(user.profilePhotoKey);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900">Your profile</h1>
      <p className="mt-1 text-sm text-slate-500">
        Update your name, company, password, and profile photo. Your email is the address you signed
        up with and can&rsquo;t be changed here.
      </p>
      {user.isAdmin && (
        <p className="mt-2 inline-block rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700 border border-red-200">
          Admin account
        </p>
      )}

      <ProfileForm
        email={user.email}
        name={user.name}
        company={user.company || ""}
        photoUrl={photoUrl}
        hasPhoto={!!user.profilePhotoKey}
      />
    </div>
  );
}
