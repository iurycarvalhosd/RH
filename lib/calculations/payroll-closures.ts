import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApiError } from "@/lib/auth/rbac";
import type { Profile } from "@/lib/types";

export async function isBranchPeriodClosed(branchId: string, year: number, month: number): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payroll_closures")
    .select("id")
    .eq("branch_id", branchId)
    .eq("period_year", year)
    .eq("period_month", month)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

// Lança/edita/exclui um registro de folha: liberado pra qualquer papel
// enquanto a folha daquela filial/período estiver aberta; uma vez fechada,
// só admin. Lança o employee_id pra descobrir a filial.
export async function requirePayrollWriteAccess(
  profile: Profile,
  employeeId: string,
  year: number,
  month: number
): Promise<void> {
  const admin = createAdminClient();
  const { data: employee, error } = await admin.from("employees").select("branch_id").eq("id", employeeId).single();
  if (error || !employee) throw new ApiError(404, "Colaborador não encontrado.");

  const closed = await isBranchPeriodClosed(employee.branch_id, year, month);
  if (closed && profile.role !== "admin") {
    throw new ApiError(403, "A folha deste período está fechada para esta filial. Só um admin pode alterar.");
  }
}
