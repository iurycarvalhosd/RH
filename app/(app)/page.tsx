"use client";

import { useEffect, useState } from "react";
import { useBranch } from "@/lib/branch-context";
import { apiGet, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";

interface DashboardData {
  summary: {
    total_employees: number;
    total_overtime_hours: number;
    vacations_needing_attention: number;
    payroll_total: number;
    average_performance_score: number | null;
  };
  alerts: Array<{ category: string; severity: "atencao" | "critico"; message: string }>;
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function DashboardPage() {
  const { activeBranchId } = useBranch();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setData(null);
    apiGet("/api/dashboard", { branchId: activeBranchId })
      .then(setData)
      .catch((e) => setError(e instanceof ClientApiError ? e.message : "Erro ao carregar visão geral."));
  }, [activeBranchId]);

  return (
    <div>
      <h1>Visão geral</h1>
      <ScopeIndicator />
      {error && <p className="error-text">{error}</p>}

      {!data ? (
        <p className="muted">Carregando...</p>
      ) : (
        <>
          <div className="card-grid">
            <div className="card">
              <div className="value">{data.summary.total_employees}</div>
              <div className="label">Colaboradores ativos</div>
            </div>
            <div className="card">
              <div className="value">{data.summary.total_overtime_hours.toFixed(1)}h</div>
              <div className="label">Horas extras no mês</div>
            </div>
            <div className="card">
              <div className="value">{data.summary.vacations_needing_attention}</div>
              <div className="label">Férias pedindo atenção</div>
            </div>
            <div className="card">
              <div className="value">{money(data.summary.payroll_total)}</div>
              <div className="label">Folha do mês (líquido)</div>
            </div>
            <div className="card">
              <div className="value">
                {data.summary.average_performance_score !== null ? data.summary.average_performance_score.toFixed(1) : "-"}
              </div>
              <div className="label">Nota média de desempenho</div>
            </div>
          </div>

          <section className="section">
            <h2>Alertas ({data.alerts.length})</h2>
            {data.alerts.length === 0 ? (
              <p className="muted">Nenhum alerta no momento.</p>
            ) : (
              <ul className="alert-list">
                {data.alerts.map((a, idx) => (
                  <li key={idx}>
                    <span className="badge" data-status={a.severity === "critico" ? "critico" : "atencao"}>
                      {a.category}
                    </span>{" "}
                    {a.message}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
