import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, ApiError } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const UserUpdate = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(["admin", "rh_padrao"]).optional(),
  password: z.string().min(6).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const me = await requireRole("admin");
    const { id } = await params;
    const body = UserUpdate.parse(await request.json());
    const admin = createAdminClient();

    if (id === me.id && body.role === "rh_padrao") {
      throw new ApiError(400, "Você não pode remover seu próprio acesso de admin.");
    }

    if (body.name !== undefined || body.role !== undefined) {
      const { error } = await admin
        .from("profiles")
        .update({ ...(body.name !== undefined && { name: body.name }), ...(body.role !== undefined && { role: body.role }) })
        .eq("id", id);
      if (error) throw error;
    }

    if (body.password) {
      const { error } = await admin.auth.admin.updateUserById(id, { password: body.password });
      if (error) throw new ApiError(400, error.message);
    }

    const { data: profile, error: profileError } = await admin.from("profiles").select("*").eq("id", id).single();
    if (profileError) throw profileError;
    return jsonOk(profile);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const me = await requireRole("admin");
    const { id } = await params;
    if (id === me.id) {
      throw new ApiError(400, "Você não pode excluir sua própria conta.");
    }
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) throw new ApiError(400, error.message);
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
