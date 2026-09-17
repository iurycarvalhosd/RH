import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Employee } from "@/lib/types";

export interface EmployeeRef {
  id: string;
  name: string;
  branch_id: string;
  branch_name: string;
  sector_id: string | null;
  sector_name: string | null;
  status: Employee["status"];
}

// Colaboradores no escopo do filtro de filial/rede ativo. Usado por todos os
// módulos que agregam dado "por colaborador" (ponto, férias, folha,
// desempenho, compliance, indicadores) para manter o mesmo recorte em
// qualquer lugar do app.
export async function listScopedEmployees(
  branchId: string | null,
  opts: { onlyActive?: boolean; sectorId?: string | null } = {}
): Promise<EmployeeRef[]> {
  const admin = createAdminClient();
  let query = admin
    .from("employees")
    .select("id, name, branch_id, sector_id, status, branch:branches(name), sector:sectors(name)");
  if (branchId) query = query.eq("branch_id", branchId);
  if (opts.sectorId) query = query.eq("sector_id", opts.sectorId);
  if (opts.onlyActive) query = query.eq("status", "active");
  const { data, error } = await query.order("name");
  if (error) throw error;
  return (
    (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      branch_id: string;
      sector_id: string | null;
      status: Employee["status"];
      branch: { name: string } | null;
      sector: { name: string } | null;
    }>
  ).map((row) => ({
    id: row.id,
    name: row.name,
    branch_id: row.branch_id,
    branch_name: row.branch?.name ?? "-",
    sector_id: row.sector_id,
    sector_name: row.sector?.name ?? null,
    status: row.status,
  }));
}
