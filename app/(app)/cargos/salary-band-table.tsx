"use client";

import { useEffect, useState } from "react";
import { useBranch } from "@/lib/branch-context";
import { apiGet, ClientApiError } from "@/lib/client/api";

interface SalaryBandRow {
  employee_id: string;
  employee_name: string;
  branch_name: string;
  position_title: string | null;
  salary_min: number | null;
  salary_mid: number | null;
  salary_max: number | null;
  current_salary: number | null;
  enquadramento: "abaixo" | "dentro" | "acima" | "sem_cargo" | "sem_folha";
}

export function SalaryBandTable() {
  const { activeBranchId } = useBranch();
  const [rows, setRows] = useState<SalaryBandRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    apiGet("/api/positions/salary-comparison", { branchId: activeBranchId })
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof ClientApiError ? e.message : "Erro ao carregar comparação.");
      });
    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  if (error) return <p className="error-text">{error}</p>;
  if (!rows) return <p className="muted">Carregando...</p>;
  if (rows.length === 0) return <p className="muted">Nenhum colaborador para comparar.</p>;

  const labels: Record<SalaryBandRow["enquadramento"], string> = {
    abaixo: "Abaixo da faixa",
    dentro: "Dentro da faixa",
    acima: "Acima da faixa",
    sem_cargo: "Sem cargo definido",
    sem_folha: "Sem folha lançada",
  };
  const statusMap: Record<SalaryBandRow["enquadramento"], string> = {
    abaixo: "atencao",
    dentro: "ok",
    acima: "atencao",
    sem_cargo: "critico",
    sem_folha: "critico",
  };

  return (
    <table>
      <thead>
        <tr>
          <th>Colaborador</th>
          <th>Filial</th>
          <th>Cargo</th>
          <th>Faixa (mín/méd/máx)</th>
          <th>Salário atual</th>
          <th>Enquadramento</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.employee_id}>
            <td>{r.employee_name}</td>
            <td>{r.branch_name}</td>
            <td>{r.position_title ?? "-"}</td>
            <td>
              {r.salary_min !== null
                ? `${r.salary_min.toLocaleString("pt-BR")} / ${r.salary_mid?.toLocaleString("pt-BR")} / ${r.salary_max?.toLocaleString("pt-BR")}`
                : "-"}
            </td>
            <td>{r.current_salary !== null ? `R$ ${r.current_salary.toLocaleString("pt-BR")}` : "-"}</td>
            <td>
              <span className="badge" data-status={statusMap[r.enquadramento]}>
                {labels[r.enquadramento]}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
