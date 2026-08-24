import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { listAllUsers } from "@/lib/admin";
import { AdminUserRow } from "@/components/AdminUserRow";

export default async function AdminUsersPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") notFound();

  const users = await listAllUsers();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="py-2 pr-4 font-medium">Name</th>
              <th className="py-2 pr-4 font-medium">Role</th>
              <th className="py-2 pr-4 font-medium">Rating</th>
              <th className="py-2 pr-4 font-medium">Status</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <AdminUserRow key={u.id} user={u} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
