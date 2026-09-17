import "server-only";
import { listScopedEmployees } from "@/lib/calculations/employees";
import { getHourBankSummary } from "@/lib/calculations/hour-bank";
import { getVacationPeriodsWithStatus } from "@/lib/calculations/vacations";
import { getPayrollSummary } from "@/lib/calculations/payroll";
import { getAverageLatestScore } from "@/lib/calculations/performance";

export interface DashboardSummary {
  total_employees: number;
  total_overtime_hours: number;
  vacations_needing_attention: number;
  payroll_total: number;
  average_performance_score: number | null;
}

export async function getDashboardSummary(branchId: string | null): Promise<DashboardSummary> {
  const now = new Date();
  const [employees, hourBank, vacationPeriods, payrollSummary, perf] = await Promise.all([
    listScopedEmployees(branchId, { onlyActive: true }),
    getHourBankSummary(branchId),
    getVacationPeriodsWithStatus(branchId),
    getPayrollSummary(branchId, now.getFullYear(), now.getMonth() + 1),
    getAverageLatestScore(branchId),
  ]);

  return {
    total_employees: employees.length,
    total_overtime_hours: hourBank.reduce((a, r) => a + r.period_overtime_hours, 0),
    vacations_needing_attention: vacationPeriods.filter((p) => p.status !== "em_dia").length,
    payroll_total: payrollSummary.current.net,
    average_performance_score: perf.average,
  };
}
