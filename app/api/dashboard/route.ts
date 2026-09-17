import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { getDashboardSummary } from "@/lib/calculations/dashboard";
import { getAlerts } from "@/lib/calculations/alerts";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const [summary, alerts] = await Promise.all([getDashboardSummary(branchId), getAlerts(branchId)]);
    return jsonOk({ summary, alerts });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
