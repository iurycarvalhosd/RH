import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, ApiError } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const UserInput = z.object({
  name: z.string().min(1, "Nome é obrigatório."),
  email: z.string().email("Email inválido."),
  password: z.string().min(6, "Senha precisa ter pelo menos 6 caracteres."),
  role: z.enum(["admin", "rh_padrao"]),
});

export async function GET() {
  try {
    await requireRole("admin");
    const admin = createAdminClient();

    const { data: profiles, error } = await admin.from("profiles").select("*").order("name");
    if (error) throw error;

    const { data: authList, error: authError } = await admin.auth.admin.listUsers();
    if (authError) throw authError;
    const emailById = new Map(authList.users.map((u) => [u.id, u.email]));

    const rows = (profiles ?? []).map((p) => ({ ...p, email: emailById.get(p.id) ?? null }));
    return jsonOk(rows);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole("admin");
    const body = UserInput.parse(await request.json());
    const admin = createAdminClient();

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
    });
    if (createError) throw new ApiError(400, createError.message);
    if (!created.user) throw new ApiError(500, "Falha ao criar usuário.");

    const { error: profileError } = await admin
      .from("profiles")
      .insert({ id: created.user.id, name: body.name, role: body.role });
    if (profileError) {
      await admin.auth.admin.deleteUser(created.user.id);
      throw profileError;
    }

    return jsonOk({ id: created.user.id, name: body.name, role: body.role, email: body.email }, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
