import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { getAverageLatestScore } from "@/lib/calculations/performance";
import { getAppSettings } from "@/lib/calculations/settings";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const [{ average, count }, settings] = await Promise.all([getAverageLatestScore(branchId), getAppSettings()]);
    return jsonOk({
      average,
      count,
      scale_min: settings.performance_scale_min,
      scale_max: settings.performance_scale_max,
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
