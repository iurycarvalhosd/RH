import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { computeExpiryStatus } from "@/lib/calculations/expiry";
import { getAppSettings } from "@/lib/calculations/settings";

const DocumentInput = z.object({
  employee_id: z.string().uuid(),
  document_type: z.string().min(1),
  expires_at: z.string().min(1),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const admin = createAdminClient();
    let query = admin
      .from("compliance_documents")
      .select("*, employee:employees!inner(id, name, branch_id)")
      .order("expires_at");
    if (branchId) query = query.eq("employee.branch_id", branchId);
    const { data, error } = await query;
    if (error) throw error;

    const settings = await getAppSettings();
    const rows = (data ?? []).map((row: { expires_at: string } & Record<string, unknown>) => ({
      ...row,
      status: computeExpiryStatus(row.expires_at, settings.compliance_alert_days),
    }));
    return jsonOk(rows);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = DocumentInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("compliance_documents").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
