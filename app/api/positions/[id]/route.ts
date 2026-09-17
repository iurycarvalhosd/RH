import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const PositionUpdate = z.object({
  title: z.string().min(1).optional(),
  salary_min: z.number().nonnegative().optional(),
  salary_mid: z.number().nonnegative().optional(),
  salary_max: z.number().nonnegative().optional(),
  function_category: z.enum(["administrativo", "comercial", "producao", "servicos_gerais"]).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = PositionUpdate.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("job_positions").update(body).eq("id", id).select().single();
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const admin = createAdminClient();
    const { error } = await admin.from("job_positions").delete().eq("id", id);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
