import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, getPeriodFilter, jsonOk } from "@/lib/api-helpers";
import { getHourBankSummary } from "@/lib/calculations/hour-bank";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const { year, month } = getPeriodFilter(request);
    const period = year && month ? { year, month } : undefined;
    const data = await getHourBankSummary(branchId, period);
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
