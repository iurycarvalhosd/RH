import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { getCurrentProfile } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppShell } from "@/components/app-shell";
import type { Branch } from "@/lib/types";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const profile = await getCurrentProfile();

  const admin = createAdminClient();
  const { data: branches } = await admin.from("branches").select("*").order("name");

  const cookieStore = await cookies();
  const initialBranchId = cookieStore.get("activeBranchId")?.value ?? "all";

  return (
    <AppShell profile={profile} branches={(branches as Branch[]) ?? []} initialBranchId={initialBranchId}>
      {children}
    </AppShell>
  );
}
