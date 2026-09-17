import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Employee } from "@/lib/types";

export interface EmployeeRef {
  id: string;
  name: string;
  branch_id: string;
  branch_name: string;
  status: Employee["status"];
}

// Colaboradores no escopo do filtro de filial/rede ativo. Usado por todos os
// módulos que agregam dado "por colaborador" (ponto, férias, folha,
// desempenho, compliance, indicadores) para manter o mesmo recorte em
// qualquer lugar do app.
export async function listScopedEmployees(
  branchId: string | null,
  opts: { onlyActive?: boolean } = {}
): Promise<EmployeeRef[]> {
  const admin = createAdminClient();
  let query = admin.from("employees").select("id, name, branch_id, status, branch:branches(name)");
  if (branchId) query = query.eq("branch_id", branchId);
  if (opts.onlyActive) query = query.eq("status", "active");
  const { data, error } = await query.order("name");
  if (error) throw error;
  return ((data ?? []) as unknown as Array<{ id: string; name: string; branch_id: string; status: Employee["status"]; branch: { name: string } | null }>).map(
    (row) => ({
      id: row.id,
      name: row.name,
      branch_id: row.branch_id,
      branch_name: row.branch?.name ?? "-",
      status: row.status,
    })
  );
}
