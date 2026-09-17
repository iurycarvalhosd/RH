import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const ClosureInput = z.object({
  branch_id: z.string().uuid().nullable(), // null = todas as filiais
  period_year: z.number().int(),
  period_month: z.number().int().min(1).max(12),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const admin = createAdminClient();
    const year = Number(request.nextUrl.searchParams.get("year"));
    const month = Number(request.nextUrl.searchParams.get("month"));

    const { data: branches, error: branchesError } = await admin.from("branches").select("id, name").order("name");
    if (branchesError) throw branchesError;

    const { data: closures, error: closuresError } = await admin
      .from("payroll_closures")
      .select("branch_id, closed_at")
      .eq("period_year", year)
      .eq("period_month", month);
    if (closuresError) throw closuresError;

    const closedByBranch = new Map((closures ?? []).map((c) => [c.branch_id, c.closed_at]));
    const rows = (branches ?? []).map((b) => ({
      branch_id: b.id,
      branch_name: b.name,
      closed: closedByBranch.has(b.id),
      closed_at: closedByBranch.get(b.id) ?? null,
    }));

    return jsonOk({ branches: rows, all_closed: rows.length > 0 && rows.every((r) => r.closed) });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await requireRole("admin");
    const body = ClosureInput.parse(await request.json());
    const admin = createAdminClient();

    let branchIds: string[];
    if (body.branch_id) {
      branchIds = [body.branch_id];
    } else {
      const { data: branches, error } = await admin.from("branches").select("id");
      if (error) throw error;
      branchIds = (branches ?? []).map((b) => b.id);
    }

    const { error: upsertError } = await admin.from("payroll_closures").upsert(
      branchIds.map((branch_id) => ({
        branch_id,
        period_year: body.period_year,
        period_month: body.period_month,
        closed_at: new Date().toISOString(),
        closed_by: profile.id,
      })),
      { onConflict: "branch_id,period_year,period_month" }
    );
    if (upsertError) throw upsertError;

    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireRole("admin");
    const body = ClosureInput.parse(await request.json());
    const admin = createAdminClient();

    let query = admin
      .from("payroll_closures")
      .delete()
      .eq("period_year", body.period_year)
      .eq("period_month", body.period_month);
    if (body.branch_id) query = query.eq("branch_id", body.branch_id);

    const { error } = await query;
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
