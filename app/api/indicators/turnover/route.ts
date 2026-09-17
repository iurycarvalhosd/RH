import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { getTurnoverByBranch, getTurnoverSeries } from "@/lib/calculations/turnover";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const series = await getTurnoverSeries(branchId, 6);
    const latest = series[series.length - 1];
    const by_branch = !branchId ? await getTurnoverByBranch(latest.year, latest.month) : [];
    return jsonOk({ series, by_branch });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
