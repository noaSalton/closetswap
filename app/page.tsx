import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">
        Rent clothes for the moment. Not the closet.
      </h1>
      <p className="mt-3 max-w-2xl text-stone-600">
        ClosetSwap lets you rent out clothes you already own, and rent great pieces from people
        near you instead of buying something you&apos;ll wear once.
      </p>
      {user && (
        <p className="mt-6 text-sm text-stone-500">
          Signed in as {user.full_name || "you"}. The item listing browser lands here next.
        </p>
      )}
    </div>
  );
}
