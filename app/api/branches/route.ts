import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const BranchInput = z.object({
  name: z.string().min(1, "Nome é obrigatório."),
  address: z.string().optional().nullable(),
  manager_name: z.string().optional().nullable(),
  cnpj: z.string().optional().nullable(),
});

export async function GET() {
  try {
    await requireProfile();
    const admin = createAdminClient();
    const { data, error } = await admin.from("branches").select("*").order("name");
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = BranchInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("branches").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
