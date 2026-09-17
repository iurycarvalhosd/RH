import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { listScopedEmployees } from "@/lib/calculations/employees";

// Média da nota mais recente de cada colaborador no escopo (não a média de
// todas as avaliações históricas, que penalizaria quem é avaliado com mais
// frequência).
export async function getAverageLatestScore(branchId: string | null): Promise<{ average: number | null; count: number }> {
  const employees = await listScopedEmployees(branchId, { onlyActive: true });
  if (employees.length === 0) return { average: null, count: 0 };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("performance_reviews")
    .select("employee_id, review_date, score")
    .in(
      "employee_id",
      employees.map((e) => e.id)
    )
    .order("review_date", { ascending: false });
  if (error) throw error;

  const latestByEmployee = new Map<string, number>();
  for (const row of (data ?? []) as Array<{ employee_id: string; score: number }>) {
    if (!latestByEmployee.has(row.employee_id)) {
      latestByEmployee.set(row.employee_id, Number(row.score));
    }
  }

  if (latestByEmployee.size === 0) return { average: null, count: 0 };
  const scores = Array.from(latestByEmployee.values());
  const average = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { average, count: scores.length };
}
