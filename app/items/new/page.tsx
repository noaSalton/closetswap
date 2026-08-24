import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ItemForm } from "@/components/ItemForm";

export default async function NewItemPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold">List an item</h1>
      <p className="mt-1 text-sm text-stone-600">
        Add photos and details so renters know exactly what they&apos;re getting.
      </p>
      <div className="mt-6">
        <ItemForm mode="create" userId={user.id} />
      </div>
    </div>
  );
}
