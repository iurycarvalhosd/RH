import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, getPeriodFilter, jsonOk } from "@/lib/api-helpers";

const TimeEntryInput = z.object({
  employee_id: z.string().uuid(),
  entry_date: z.string().min(1),
  hours_worked: z.number().nonnegative().default(0),
  overtime_hours: z.number().nonnegative().default(0),
  source: z.enum(["manual", "import"]).default("manual"),
  notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const employeeId = request.nextUrl.searchParams.get("employeeId");
    const { year, month } = getPeriodFilter(request);

    const admin = createAdminClient();
    let query = admin
      .from("time_entries")
      .select("*, employee:employees!inner(id, name, branch_id)")
      .order("entry_date", { ascending: false });

    if (employeeId) query = query.eq("employee_id", employeeId);
    if (branchId) query = query.eq("employee.branch_id", branchId);
    if (year && month) {
      const start = `${year}-${String(month).padStart(2, "0")}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      query = query.gte("entry_date", start).lte("entry_date", end);
    }

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
    const body = TimeEntryInput.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("time_entries")
      .upsert(body, { onConflict: "employee_id,entry_date" })
      .select()
      .single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
