import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPayrollSummary } from "@/lib/calculations/payroll";

export interface HrCostBreakdown {
  payroll: number;
  benefits: number;
  training: number;
  other: number;
  total: number;
  by_sector: Array<{ sector_id: string; sector_name: string; payroll_net: number }>;
}

function monthBounds(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}

export async function getHrCostBreakdown(branchId: string | null, year: number, month: number): Promise<HrCostBreakdown> {
  const admin = createAdminClient();
  const payrollSummary = await getPayrollSummary(branchId, year, month);

  const { start, end } = monthBounds(year, month);

  let trainingQuery = admin.from("training_investments").select("cost, branch_id").gte("training_date", start).lte("training_date", end);
  let otherQuery = admin.from("other_costs").select("amount, branch_id").eq("period_year", year).eq("period_month", month);
  if (branchId) {
    trainingQuery = trainingQuery.eq("branch_id", branchId);
    otherQuery = otherQuery.eq("branch_id", branchId);
  }

  const [{ data: trainings, error: trainingError }, { data: others, error: otherError }] = await Promise.all([
    trainingQuery,
    otherQuery,
  ]);
  if (trainingError) throw trainingError;
  if (otherError) throw otherError;

  const training = (trainings ?? []).reduce((a, t) => a + Number(t.cost), 0);
  const other = (others ?? []).reduce((a, o) => a + Number(o.amount), 0);
  const payroll = payrollSummary.current.base_salary;
  const benefits = payrollSummary.current.benefits;
  const by_sector = payrollSummary.by_sector.map((s) => ({
    sector_id: s.sector_id,
    sector_name: s.sector_name,
    payroll_net: s.net,
  }));

  return { payroll, benefits, training, other, total: payroll + benefits + training + other, by_sector };
}
