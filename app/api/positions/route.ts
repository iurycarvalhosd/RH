import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const PositionInput = z.object({
  title: z.string().min(1, "Título é obrigatório."),
  salary_min: z.number().nonnegative(),
  salary_mid: z.number().nonnegative(),
  salary_max: z.number().nonnegative(),
  function_category: z.enum(["administrativo", "comercial", "producao", "servicos_gerais"]).nullable().optional(),
});

export async function GET() {
  try {
    await requireProfile();
    const admin = createAdminClient();
    const { data, error } = await admin.from("job_positions").select("*").order("title");
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = PositionInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("job_positions").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
