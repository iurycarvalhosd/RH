import { type NextRequest } from "next/server";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { getAbsenteeismByBranch, getAbsenteeismBySector, getAbsenteeismSeries } from "@/lib/calculations/absenteeism";

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const series = await getAbsenteeismSeries(branchId, 6);
    const latest = series[series.length - 1];
    const by_branch = !branchId && latest ? await getAbsenteeismByBranch(latest.year, latest.month) : [];
    const now = new Date();
    const by_sector = await getAbsenteeismBySector(
      latest?.year ?? now.getFullYear(),
      latest?.month ?? now.getMonth() + 1,
      branchId
    );
    return jsonOk({ series, by_branch, by_sector });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
