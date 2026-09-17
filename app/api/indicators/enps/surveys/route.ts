import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const SurveyInput = z.object({
  branch_id: z.string().uuid().nullable().optional(),
  period_year: z.number().int(),
  period_month: z.number().int().min(1).max(12),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = request.nextUrl.searchParams.get("branchId");
    const admin = createAdminClient();
    let query = admin
      .from("enps_surveys")
      .select("*, branch:branches(id, name)")
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });
    if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
    const { data, error } = await query;
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = SurveyInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("enps_surveys").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
