import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const TrainingInvestmentInput = z.object({
  branch_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  cost: z.number().nonnegative(),
  training_date: z.string().min(1),
  roi_score: z.number().min(0).max(10).nullable().optional(),
  roi_notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = request.nextUrl.searchParams.get("branchId");
    const admin = createAdminClient();
    let query = admin
      .from("training_investments")
      .select("*, branch:branches(id, name)")
      .order("training_date", { ascending: false });
    if (branchId && branchId !== "all") query = query.eq("branch_id", branchId);
    const { data, error } = await query;
    if (error) throw error;

    type TrainingRow = { roi_score: number | null; cost: number };
    const rows = (data ?? []) as TrainingRow[];
    const scored = rows.filter((r) => r.roi_score !== null);
    const averageRoi = scored.length > 0 ? scored.reduce((a, r) => a + Number(r.roi_score), 0) / scored.length : null;
    const totalCost = rows.reduce((a, r) => a + Number(r.cost), 0);

    return jsonOk({ items: data, average_roi_score: averageRoi, total_cost: totalCost });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = TrainingInvestmentInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("training_investments").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
