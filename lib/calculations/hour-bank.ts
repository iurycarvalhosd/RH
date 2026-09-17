import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listScopedEmployees } from "@/lib/calculations/employees";
import { getAppSettings } from "@/lib/calculations/settings";

export type HourBankStatus = "ok" | "atencao" | "acima";

export interface HourBankRow {
  employee_id: string;
  employee_name: string;
  branch_name: string;
  period_overtime_hours: number;
  cumulative_balance_hours: number;
  limit_hours: number;
  status: HourBankStatus;
}

function monthRange(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function getHourBankSummary(
  branchId: string | null,
  period?: { year: number; month: number }
): Promise<HourBankRow[]> {
  const now = new Date();
  const { year, month } = period ?? { year: now.getFullYear(), month: now.getMonth() + 1 };
  const { start, end } = monthRange(year, month);

  const employees = await listScopedEmployees(branchId, { onlyActive: true });
  if (employees.length === 0) return [];

  const settings = await getAppSettings();
  const admin = createAdminClient();
  const employeeIds = employees.map((e) => e.id);

  const { data: entries, error } = await admin
    .from("time_entries")
    .select("employee_id, entry_date, overtime_hours")
    .in("employee_id", employeeIds);
  if (error) throw error;

  const cumulative = new Map<string, number>();
  const periodSum = new Map<string, number>();
  for (const entry of (entries ?? []) as Array<{ employee_id: string; entry_date: string; overtime_hours: number }>) {
    cumulative.set(entry.employee_id, (cumulative.get(entry.employee_id) ?? 0) + Number(entry.overtime_hours));
    if (entry.entry_date >= start && entry.entry_date <= end) {
      periodSum.set(entry.employee_id, (periodSum.get(entry.employee_id) ?? 0) + Number(entry.overtime_hours));
    }
  }

  const limit = settings.hour_bank_limit_hours;
  const attentionThreshold = limit * (settings.hour_bank_attention_pct / 100);

  const rows: HourBankRow[] = employees.map((emp) => {
    const balance = cumulative.get(emp.id) ?? 0;
    let status: HourBankStatus = "ok";
    if (balance > limit) status = "acima";
    else if (balance >= attentionThreshold) status = "atencao";
    return {
      employee_id: emp.id,
      employee_name: emp.name,
      branch_name: emp.branch_name,
      period_overtime_hours: periodSum.get(emp.id) ?? 0,
      cumulative_balance_hours: balance,
      limit_hours: limit,
      status,
    };
  });

  rows.sort((a, b) => b.cumulative_balance_hours - a.cumulative_balance_hours);
  return rows;
}
