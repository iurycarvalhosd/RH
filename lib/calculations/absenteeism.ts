import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listScopedEmployees } from "@/lib/calculations/employees";

const WORKING_DAYS_PER_MONTH = 22;

export interface AbsenteeismPoint {
  year: number;
  month: number;
  absence_days: number;
  rate_pct: number | null;
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function getAbsenteeismSeries(branchId: string | null, monthsBack = 6): Promise<AbsenteeismPoint[]> {
  const employees = await listScopedEmployees(branchId, { onlyActive: true });
  const employeeIds = employees.map((e) => e.id);
  if (employeeIds.length === 0) return [];

  const admin = createAdminClient();
  const { data: absences, error } = await admin
    .from("absence_records")
    .select("employee_id, absence_date")
    .in("employee_id", employeeIds);
  if (error) throw error;

  const now = new Date();
  const points: AbsenteeismPoint[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth() + 1;
    const { start, end } = monthBounds(year, month);
    const count = (absences ?? []).filter((a) => a.absence_date >= start && a.absence_date <= end).length;
    const availableDays = employees.length * WORKING_DAYS_PER_MONTH;
    const rate_pct = availableDays > 0 ? (count / availableDays) * 100 : null;
    points.push({ year, month, absence_days: count, rate_pct });
  }
  return points;
}

export async function getAbsenteeismByBranch(year: number, month: number) {
  const admin = createAdminClient();
  const { data: branches, error } = await admin.from("branches").select("id, name").order("name");
  if (error) throw error;

  return Promise.all(
    (branches ?? []).map(async (b) => {
      const series = await getAbsenteeismSeries(b.id, 1);
      const point = series.find((p) => p.year === year && p.month === month) ?? series[series.length - 1];
      return { branch_id: b.id, branch_name: b.name, rate_pct: point?.rate_pct ?? null };
    })
  );
}
