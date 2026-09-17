import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { getSalaryBandComparison } from "@/lib/calculations/salary-band";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const data = await getSalaryBandComparison(branchId);
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
