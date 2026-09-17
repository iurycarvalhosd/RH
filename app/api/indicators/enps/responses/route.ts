import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const ResponseInput = z.object({
  survey_id: z.string().uuid(),
  employee_id: z.string().uuid().nullable().optional(),
  score: z.number().int().min(0).max(10),
});

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = ResponseInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("enps_responses").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
