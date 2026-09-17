import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { getEnpsHistory } from "@/lib/calculations/enps";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const history = await getEnpsHistory(branchId);
    return jsonOk(history);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
