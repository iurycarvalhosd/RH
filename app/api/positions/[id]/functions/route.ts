import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const FunctionInput = z.object({
  description: z.string().min(1, "Descrição é obrigatória."),
  sort_order: z.number().int().default(0),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireProfile();
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("position_functions")
      .select("*")
      .eq("position_id", id)
      .order("sort_order")
      .order("created_at");
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireProfile();
    const { id } = await params;
    const body = FunctionInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("position_functions")
      .insert({ ...body, position_id: id })
      .select()
      .single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
