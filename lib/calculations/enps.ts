import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface EnpsPoint {
  survey_id: string;
  branch_id: string | null;
  year: number;
  month: number;
  responses: number;
  enps: number | null;
}

export async function getEnpsHistory(branchId: string | null): Promise<EnpsPoint[]> {
  const admin = createAdminClient();
  let query = admin
    .from("enps_surveys")
    .select("id, branch_id, period_year, period_month, enps_responses(score)")
    .order("period_year")
    .order("period_month");
  if (branchId) query = query.eq("branch_id", branchId);

  const { data, error } = await query;
  if (error) throw error;

  type SurveyRow = {
    id: string;
    branch_id: string | null;
    period_year: number;
    period_month: number;
    enps_responses?: Array<{ score: number }>;
  };
  return ((data ?? []) as SurveyRow[]).map((row) => {
    const scores: number[] = (row.enps_responses ?? []).map((r) => Number(r.score));
    if (scores.length === 0) {
      return {
        survey_id: row.id,
        branch_id: row.branch_id,
        year: row.period_year,
        month: row.period_month,
        responses: 0,
        enps: null,
      };
    }
    const promoters = scores.filter((s) => s >= 9).length;
    const detractors = scores.filter((s) => s <= 6).length;
    const enps = ((promoters - detractors) / scores.length) * 100;
    return {
      survey_id: row.id,
      branch_id: row.branch_id,
      year: row.period_year,
      month: row.period_month,
      responses: scores.length,
      enps,
    };
  });
}
