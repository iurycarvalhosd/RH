import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, ApiError } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";
import { requirePayrollWriteAccess } from "@/lib/calculations/payroll-closures";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const profile = await requireProfile();
    const { id } = await params;
    const admin = createAdminClient();

    const { data: record, error: findError } = await admin
      .from("payroll_records")
      .select("employee_id, period_year, period_month")
      .eq("id", id)
      .single();
    if (findError || !record) throw new ApiError(404, "Lançamento de folha não encontrado.");

    await requirePayrollWriteAccess(profile, record.employee_id, record.period_year, record.period_month);

    const { error } = await admin.from("payroll_records").delete().eq("id", id);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
