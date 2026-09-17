import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppSettings } from "@/lib/calculations/settings";
import type { VacationPeriod } from "@/lib/types";

export type VacationStatus = "em_dia" | "atencao" | "vencida";

export function computeVacationStatus(dueDate: string, alertDays: number, today: Date = new Date()): VacationStatus {
  const due = new Date(dueDate + "T00:00:00");
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.ceil((due.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "vencida";
  if (diffDays <= alertDays) return "atencao";
  return "em_dia";
}

export interface VacationPeriodStatusRow extends VacationPeriod {
  employee_name: string;
  branch_name: string;
  status: VacationStatus;
}

export async function getVacationPeriodsWithStatus(branchId: string | null): Promise<VacationPeriodStatusRow[]> {
  const admin = createAdminClient();
  let query = admin
    .from("vacation_periods")
    .select("*, employee:employees!inner(id, name, branch_id, branch:branches(name))")
    .order("due_date");
  if (branchId) query = query.eq("employee.branch_id", branchId);
  const { data, error } = await query;
  if (error) throw error;

  const settings = await getAppSettings();
  return ((data ?? []) as unknown as Array<VacationPeriod & { employee: { name: string; branch: { name: string } | null } }>).map(
    (row) => ({
      ...row,
      employee_name: row.employee?.name ?? "-",
      branch_name: row.employee?.branch?.name ?? "-",
      status: computeVacationStatus(row.due_date, settings.vacation_alert_days),
    })
  );
}
