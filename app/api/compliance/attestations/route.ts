import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";

const AttestationInput = z.object({
  employee_id: z.string().uuid(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  reason: z.string().min(1),
  status: z.enum(["aprovado", "pendente", "rejeitado"]).default("pendente"),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const admin = createAdminClient();
    let query = admin
      .from("attestations")
      .select("*, employee:employees!inner(id, name, branch_id)")
      .order("start_date", { ascending: false });
    if (branchId) query = query.eq("employee.branch_id", branchId);
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
    const body = AttestationInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("attestations").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
