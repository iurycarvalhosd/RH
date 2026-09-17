import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listScopedEmployees } from "@/lib/calculations/employees";

export interface PayrollTotals {
  base_salary: number;
  benefits: number;
  deductions: number;
  net: number;
  employee_count: number;
}

async function sumForEmployees(employeeIds: string[], year: number, month: number): Promise<PayrollTotals> {
  if (employeeIds.length === 0) {
    return { base_salary: 0, benefits: 0, deductions: 0, net: 0, employee_count: 0 };
  }
  const admin = createAdminClient();
  const { data: records, error } = await admin
    .from("payroll_records")
    .select("id, employee_id, base_salary")
    .in("employee_id", employeeIds)
    .eq("period_year", year)
    .eq("period_month", month);
  if (error) throw error;

  const recordIds = (records ?? []).map((r) => r.id);
  let benefitsSum = 0;
  let deductionsSum = 0;

  if (recordIds.length > 0) {
    const { data: benefits } = await admin.from("payroll_benefits").select("payroll_record_id, value").in("payroll_record_id", recordIds);
    benefitsSum = (benefits ?? []).reduce((acc, b) => acc + Number(b.value), 0);
    const { data: deductions } = await admin
      .from("payroll_deductions")
      .select("payroll_record_id, value")
      .in("payroll_record_id", recordIds);
    deductionsSum = (deductions ?? []).reduce((acc, d) => acc + Number(d.value), 0);
  }

  const baseSum = (records ?? []).reduce((acc, r) => acc + Number(r.base_salary), 0);
  return {
    base_salary: baseSum,
    benefits: benefitsSum,
    deductions: deductionsSum,
    net: baseSum + benefitsSum - deductionsSum,
    employee_count: records?.length ?? 0,
  };
}

function previousMonth(year: number, month: number) {
  return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}

export interface PayrollSummary {
  current: PayrollTotals;
  previous: PayrollTotals;
  variation_pct: number | null;
  by_branch: Array<{ branch_id: string; branch_name: string; net: number }>;
  by_sector: Array<{ sector_id: string; sector_name: string; net: number }>;
}

export async function getPayrollSummary(branchId: string | null, year: number, month: number): Promise<PayrollSummary> {
  const employees = await listScopedEmployees(branchId);
  const employeeIds = employees.map((e) => e.id);

  const current = await sumForEmployees(employeeIds, year, month);
  const prev = previousMonth(year, month);
  const previous = await sumForEmployees(employeeIds, prev.year, prev.month);

  const variation_pct = previous.net > 0 ? ((current.net - previous.net) / previous.net) * 100 : null;

  let by_branch: PayrollSummary["by_branch"] = [];
  if (!branchId) {
    const branchGroups = new Map<string, { branch_id: string; branch_name: string; ids: string[] }>();
    for (const emp of employees) {
      const g = branchGroups.get(emp.branch_id) ?? { branch_id: emp.branch_id, branch_name: emp.branch_name, ids: [] };
      g.ids.push(emp.id);
      branchGroups.set(emp.branch_id, g);
    }
    by_branch = await Promise.all(
      Array.from(branchGroups.values()).map(async (g) => {
        const totals = await sumForEmployees(g.ids, year, month);
        return { branch_id: g.branch_id, branch_name: g.branch_name, net: totals.net };
      })
    );
  }

  const sectorGroups = new Map<string, { sector_id: string; sector_name: string; ids: string[] }>();
  for (const emp of employees) {
    if (!emp.sector_id) continue;
    const g = sectorGroups.get(emp.sector_id) ?? {
      sector_id: emp.sector_id,
      sector_name: emp.sector_name ?? "-",
      ids: [],
    };
    g.ids.push(emp.id);
    sectorGroups.set(emp.sector_id, g);
  }
  const by_sector = await Promise.all(
    Array.from(sectorGroups.values()).map(async (g) => {
      const totals = await sumForEmployees(g.ids, year, month);
      return { sector_id: g.sector_id, sector_name: g.sector_name, net: totals.net };
    })
  );

  return { current, previous, variation_pct, by_branch, by_sector };
}
