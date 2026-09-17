"use client";

import { useEffect, useState } from "react";
import { useBranch } from "@/lib/branch-context";
import { apiGet, ClientApiError } from "@/lib/client/api";
import type { TrainingComplianceRow } from "@/lib/types";

const statusLabel: Record<string, string> = {
  nunca_realizado: "Nunca realizado",
  atrasado: "Atrasado",
  a_vencer: "A vencer",
  valido: "Válido",
};
const statusBadge: Record<string, string> = {
  nunca_realizado: "critico",
  atrasado: "critico",
  a_vencer: "atencao",
  valido: "ok",
};

export function TrainingComplianceTable({ reloadKey }: { reloadKey: number }) {
  const { activeBranchId } = useBranch();
  const [rows, setRows] = useState<TrainingComplianceRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    apiGet("/api/training-compliance", { branchId: activeBranchId })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ClientApiError ? e.message : "Erro ao carregar situação de treinamentos.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeBranchId, reloadKey]);

  if (error) return <p className="error-text">{error}</p>;
  if (!rows) return <p className="muted">Carregando...</p>;
  if (rows.length === 0) return <p className="muted">Nenhum treinamento se aplica aos colaboradores deste escopo ainda.</p>;

  return (
    <table>
      <thead>
        <tr>
          <th>Colaborador</th>
          <th>Filial</th>
          <th>Treinamento</th>
          <th>Última realização</th>
          <th>Próximo vencimento</th>
          <th>Situação</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={`${r.employee_id}-${r.training_program_id}`}>
            <td>{r.employee_name}</td>
            <td>{r.branch_name}</td>
            <td>{r.training_program_name}</td>
            <td>{r.last_session_date ? new Date(r.last_session_date + "T00:00:00").toLocaleDateString("pt-BR") : "-"}</td>
            <td>{r.next_due_date ? new Date(r.next_due_date + "T00:00:00").toLocaleDateString("pt-BR") : "-"}</td>
            <td>
              <span className="badge" data-status={statusBadge[r.status]}>
                {statusLabel[r.status]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
