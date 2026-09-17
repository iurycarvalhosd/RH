import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

interface EmployeeLifecycle {
  id: string;
  branch_id: string;
  sector_id: string | null;
  hire_date: string;
  termination_date: string | null;
}

async function loadLifecycles(branchId: string | null, sectorId: string | null = null): Promise<EmployeeLifecycle[]> {
  const admin = createAdminClient();
  let query = admin.from("employees").select("id, branch_id, sector_id, hire_date, terminations(termination_date)");
  if (branchId) query = query.eq("branch_id", branchId);
  if (sectorId) query = query.eq("sector_id", sectorId);
  const { data, error } = await query;
  if (error) throw error;
  type EmployeeRow = {
    id: string;
    branch_id: string;
    sector_id: string | null;
    hire_date: string;
    terminations: { termination_date: string } | { termination_date: string }[] | null;
  };
  return ((data ?? []) as unknown as EmployeeRow[]).map((row) => {
    const termination = Array.isArray(row.terminations) ? row.terminations[0] : row.terminations;
    return {
      id: row.id,
      branch_id: row.branch_id,
      sector_id: row.sector_id,
      hire_date: row.hire_date,
      termination_date: termination?.termination_date ?? null,
    };
  });
}

function isActiveAt(emp: EmployeeLifecycle, dateStr: string): boolean {
  if (emp.hire_date > dateStr) return false;
  if (emp.termination_date && emp.termination_date <= dateStr) return false;
  return true;
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export interface TurnoverPoint {
  year: number;
  month: number;
  terminations: number;
  headcount_avg: number;
  rate_pct: number | null;
}

export async function getTurnoverSeries(
  branchId: string | null,
  monthsBack = 6,
  sectorId: string | null = null
): Promise<TurnoverPoint[]> {
  const lifecycles = await loadLifecycles(branchId, sectorId);
  const now = new Date();
  const points: TurnoverPoint[] = [];

  for (let i = monthsBack - 1; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = ref.getFullYear();
    const month = ref.getMonth() + 1;
    const { start, end } = monthBounds(year, month);

    const activeStart = lifecycles.filter((e) => isActiveAt(e, start)).length;
    const activeEnd = lifecycles.filter((e) => isActiveAt(e, end)).length;
    const headcountAvg = (activeStart + activeEnd) / 2;
    const terminations = lifecycles.filter(
      (e) => e.termination_date && e.termination_date >= start && e.termination_date <= end
    ).length;
    const rate_pct = headcountAvg > 0 ? (terminations / headcountAvg) * 100 : null;

    points.push({ year, month, terminations, headcount_avg: headcountAvg, rate_pct });
  }

  return points;
}

export async function getTurnoverByBranch(year: number, month: number): Promise<Array<{ branch_id: string; branch_name: string; rate_pct: number | null }>> {
  const admin = createAdminClient();
  const { data: branches, error } = await admin.from("branches").select("id, name").order("name");
  if (error) throw error;

  const results = await Promise.all(
    (branches ?? []).map(async (b) => {
      const series = await getTurnoverSeries(b.id, 1);
      const point = series.find((p) => p.year === year && p.month === month) ?? series[series.length - 1];
      return { branch_id: b.id, branch_name: b.name, rate_pct: point?.rate_pct ?? null };
    })
  );
  return results;
}

export async function getTurnoverBySector(
  year: number,
  month: number,
  branchId: string | null
): Promise<Array<{ sector_id: string; sector_name: string; rate_pct: number | null }>> {
  const admin = createAdminClient();
  const { data: sectors, error } = await admin.from("sectors").select("id, name").order("name");
  if (error) throw error;

  const results = await Promise.all(
    (sectors ?? []).map(async (s) => {
      const series = await getTurnoverSeries(branchId, 1, s.id);
      const point = series.find((p) => p.year === year && p.month === month) ?? series[series.length - 1];
      return { sector_id: s.id, sector_name: s.name, rate_pct: point?.rate_pct ?? null };
    })
  );
  return results;
}
