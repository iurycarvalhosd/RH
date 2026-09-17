import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, Role } from "@/lib/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Usado por Route Handlers (API JSON) - nunca redireciona, só lança
// ApiError para o caller decidir o status HTTP. Para Server Components/
// páginas, use lib/auth/dal.ts (que redireciona para /login).
export async function getSessionProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}

export async function requireProfile(): Promise<Profile> {
  const profile = await getSessionProfile();
  if (!profile) throw new ApiError(401, "Não autenticado.");
  return profile;
}

export async function requireRole(role: Role): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role !== role) {
    throw new ApiError(403, "Ação restrita a administradores.");
  }
  return profile;
}

// Atalho para o padrão de permissão do app: leitura e criação são liberadas
// para qualquer papel autenticado; edição/exclusão exigem admin.
export const requireCanRead = requireProfile;
export const requireCanCreate = requireProfile;
export const requireCanEditOrDelete = () => requireRole("admin");
