import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { computeExpiryStatus } from "@/lib/calculations/expiry";
import { getAppSettings } from "@/lib/calculations/settings";

const PpeInput = z.object({
  employee_id: z.string().uuid(),
  item: z.string().min(1),
  ca_number: z.string().min(1, "Número do CA é obrigatório."),
  delivery_date: z.string().min(1),
  expiry_date: z.string().nullable().optional(),
  confirmed: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const admin = createAdminClient();
    let query = admin
      .from("ppe_deliveries")
      .select("*, employee:employees!inner(id, name, branch_id)")
      .order("delivery_date", { ascending: false });
    if (branchId) query = query.eq("employee.branch_id", branchId);
    const { data, error } = await query;
    if (error) throw error;

    const settings = await getAppSettings();
    const rows = (data ?? []).map(
      (row: { expiry_date: string | null; active: boolean } & Record<string, unknown>) => ({
        ...row,
        status: row.active && row.expiry_date ? computeExpiryStatus(row.expiry_date, settings.compliance_alert_days) : null,
      })
    );
    return jsonOk(rows);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const parsed = PpeInput.parse(await request.json());
    const body = {
      ...parsed,
      confirmed_at: parsed.confirmed ? new Date().toISOString() : null,
    };
    const admin = createAdminClient();
    const { data, error } = await admin.from("ppe_deliveries").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
