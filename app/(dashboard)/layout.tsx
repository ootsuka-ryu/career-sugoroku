import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  let user: User | null = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.error ? null : result.data.user;
  } catch {
    user = null;
  }

  if (!user) {
    redirect("/login");
  }

  const { count: unreadNotifications } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("staff_id", user.id)
    .is("read_at", null);

  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar email={user.email} unreadNotifications={unreadNotifications ?? 0} />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
