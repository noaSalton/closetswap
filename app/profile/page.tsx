import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/ProfileForm";

export default async function OwnProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Your profile</h1>
      <div className="mt-6">
        <ProfileForm fullName={user.full_name} bio={user.bio ?? ""} />
      </div>
    </div>
  );
}
