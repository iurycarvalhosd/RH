import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { getHrCostBreakdown } from "@/lib/calculations/hr-cost";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const now = new Date();
    const year = Number(request.nextUrl.searchParams.get("year")) || now.getFullYear();
    const month = Number(request.nextUrl.searchParams.get("month")) || now.getMonth() + 1;
    const data = await getHrCostBreakdown(branchId, year, month);
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
