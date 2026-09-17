import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Enquadramento = "abaixo" | "dentro" | "acima" | "sem_cargo" | "sem_folha";

export interface SalaryBandRow {
  employee_id: string;
  employee_name: string;
  branch_name: string;
  position_title: string | null;
  salary_min: number | null;
  salary_mid: number | null;
  salary_max: number | null;
  current_salary: number | null;
  enquadramento: Enquadramento;
}

interface EmployeeSalaryRow {
  id: string;
  name: string;
  branch: { name: string } | null;
  position: { title: string; salary_min: number; salary_mid: number; salary_max: number } | null;
}

export async function getSalaryBandComparison(branchId: string | null): Promise<SalaryBandRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("employees")
    .select("id, name, branch:branches(name), position:job_positions(title, salary_min, salary_mid, salary_max)")
    .eq("status", "active");
  if (branchId) query = query.eq("branch_id", branchId);

  const { data: employeesData, error } = await query.order("name");
  if (error) throw error;
  const employees = (employeesData ?? []) as unknown as EmployeeSalaryRow[];

  const employeeIds = employees.map((e) => e.id);
  const latestSalaryByEmployee = new Map<string, number>();

  if (employeeIds.length > 0) {
    const { data: records, error: payrollError } = await admin
      .from("payroll_records")
      .select("employee_id, base_salary, period_year, period_month")
      .in("employee_id", employeeIds)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });
    if (payrollError) throw payrollError;
    for (const r of (records ?? []) as Array<{ employee_id: string; base_salary: number }>) {
      if (!latestSalaryByEmployee.has(r.employee_id)) {
        latestSalaryByEmployee.set(r.employee_id, Number(r.base_salary));
      }
    }
  }

  return employees.map((emp) => {
    const position = emp.position;
    const currentSalary = latestSalaryByEmployee.get(emp.id) ?? null;

    let enquadramento: Enquadramento;
    if (!position) enquadramento = "sem_cargo";
    else if (currentSalary === null) enquadramento = "sem_folha";
    else if (currentSalary < Number(position.salary_min)) enquadramento = "abaixo";
    else if (currentSalary > Number(position.salary_max)) enquadramento = "acima";
    else enquadramento = "dentro";

    return {
      employee_id: emp.id,
      employee_name: emp.name,
      branch_name: emp.branch?.name ?? "-",
      position_title: position?.title ?? null,
      salary_min: position ? Number(position.salary_min) : null,
      salary_mid: position ? Number(position.salary_mid) : null,
      salary_max: position ? Number(position.salary_max) : null,
      current_salary: currentSalary,
      enquadramento,
    };
  });
}
