import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, getPeriodFilter, jsonOk } from "@/lib/api-helpers";
import { requirePayrollWriteAccess } from "@/lib/calculations/payroll-closures";

const LineItem = z.object({ name: z.string().min(1), value: z.number() });

const RecordInput = z.object({
  employee_id: z.string().uuid(),
  period_year: z.number().int(),
  period_month: z.number().int().min(1).max(12),
  base_salary: z.number().nonnegative(),
  benefits: z.array(LineItem).default([]),
  deductions: z.array(LineItem).default([]),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const employeeId = request.nextUrl.searchParams.get("employeeId");
    const { year, month } = getPeriodFilter(request);

    const admin = createAdminClient();
    let query = admin
      .from("payroll_records")
      .select(
        "*, employee:employees!inner(id, name, branch_id), benefits:payroll_benefits(*), deductions:payroll_deductions(*)"
      )
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });
    if (employeeId) query = query.eq("employee_id", employeeId);
    if (branchId) query = query.eq("employee.branch_id", branchId);
    if (year) query = query.eq("period_year", year);
    if (month) query = query.eq("period_month", month);

    const { data, error } = await query;
    if (error) throw error;

    type LineItem = { value: number };
    type RecordRow = { base_salary: number; benefits?: LineItem[]; deductions?: LineItem[] } & Record<string, unknown>;
    const rows = ((data ?? []) as RecordRow[]).map((r) => {
      const benefitsSum = (r.benefits ?? []).reduce((a, b) => a + Number(b.value), 0);
      const deductionsSum = (r.deductions ?? []).reduce((a, d) => a + Number(d.value), 0);
      return { ...r, net_value: Number(r.base_salary) + benefitsSum - deductionsSum };
    });
    return jsonOk(rows);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await requireProfile();
    const body = RecordInput.parse(await request.json());
    await requirePayrollWriteAccess(profile, body.employee_id, body.period_year, body.period_month);
    const admin = createAdminClient();

    const { data: record, error } = await admin
      .from("payroll_records")
      .upsert(
        {
          employee_id: body.employee_id,
          period_year: body.period_year,
          period_month: body.period_month,
          base_salary: body.base_salary,
        },
        { onConflict: "employee_id,period_year,period_month" }
      )
      .select()
      .single();
    if (error) throw error;

    // Recomeça a lista de benefícios/descontos do zero para simplificar edição.
    await admin.from("payroll_benefits").delete().eq("payroll_record_id", record.id);
    await admin.from("payroll_deductions").delete().eq("payroll_record_id", record.id);

    if (body.benefits.length > 0) {
      const { error: benefitsError } = await admin
        .from("payroll_benefits")
        .insert(body.benefits.map((b) => ({ ...b, payroll_record_id: record.id })));
      if (benefitsError) throw benefitsError;
    }
    if (body.deductions.length > 0) {
      const { error: deductionsError } = await admin
        .from("payroll_deductions")
        .insert(body.deductions.map((d) => ({ ...d, payroll_record_id: record.id })));
      if (deductionsError) throw deductionsError;
    }

    return jsonOk(record, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
