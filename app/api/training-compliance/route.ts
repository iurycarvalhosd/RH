import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { getTrainingCompliance } from "@/lib/calculations/training-compliance";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const data = await getTrainingCompliance(branchId);
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
