import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";
import { DEFAULT_ONBOARDING_TASKS } from "@/lib/types";

const TaskInput = z.object({
  employee_id: z.string().uuid(),
  task_name: z.string().min(1),
  sort_order: z.number().int().default(0),
});

const SeedInput = z.object({ employee_id: z.string().uuid() });

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const employeeId = request.nextUrl.searchParams.get("employeeId");

    const admin = createAdminClient();
    let query = admin
      .from("onboarding_tasks")
      .select("*, employee:employees!inner(id, name, branch_id)")
      .order("sort_order");
    if (employeeId) query = query.eq("employee_id", employeeId);
    if (branchId) query = query.eq("employee.branch_id", branchId);

    const { data, error } = await query;
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const url = new URL(request.url);
    const admin = createAdminClient();

    if (url.searchParams.get("action") === "seed") {
      const { employee_id } = SeedInput.parse(await request.json());
      const { data: existing } = await admin.from("onboarding_tasks").select("id").eq("employee_id", employee_id).limit(1);
      if (existing && existing.length > 0) {
        return jsonOk({ ok: true, seeded: false });
      }
      const rows = DEFAULT_ONBOARDING_TASKS.map((task_name, idx) => ({ employee_id, task_name, sort_order: idx }));
      const { error } = await admin.from("onboarding_tasks").insert(rows);
      if (error) throw error;
      return jsonOk({ ok: true, seeded: true }, { status: 201 });
    }

    const body = TaskInput.parse(await request.json());
    const { data, error } = await admin.from("onboarding_tasks").insert(body).select().single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
