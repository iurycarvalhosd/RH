import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile } from "@/lib/types";

// Data Access Layer para Server Components/páginas: redireciona para
// /login se não houver sessão válida. Memoizado por request com cache().
export const verifyUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile> => {
  const user = await verifyUser();
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!data) redirect("/login");
  return data as Profile;
});

export async function requireAdminPage(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (profile.role !== "admin") redirect("/");
  return profile;
}
