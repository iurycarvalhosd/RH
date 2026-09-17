"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import { PeriodSelector, useCurrentPeriod } from "@/components/period-selector";
import type { EmployeeRefLite, PayrollRecordFull } from "@/lib/client/shared-types";

interface ClosureInfo {
  branches: Array<{ branch_id: string; branch_name: string; closed: boolean; closed_at: string | null }>;
  all_closed: boolean;
}

interface LineItem {
  name: string;
  value: string;
}

interface Summary {
  current: { base_salary: number; benefits: number; deductions: number; net: number; employee_count: number };
  previous: { net: number };
  variation_pct: number | null;
  by_branch: Array<{ branch_id: string; branch_name: string; net: number }>;
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function FolhaPage() {
  const { activeBranchId, isNetworkScope } = useBranch();
  const isAdmin = useIsAdmin();
  const period = useCurrentPeriod();
  const [records, setRecords] = useState<PayrollRecordFull[] | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [employees, setEmployees] = useState<EmployeeRefLite[]>([]);
  const [closures, setClosures] = useState<ClosureInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [baseSalary, setBaseSalary] = useState("");
  const [benefits, setBenefits] = useState<LineItem[]>([]);
  const [deductions, setDeductions] = useState<LineItem[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadRecords() {
    try {
      setRecords(await apiGet("/api/payroll/records", { branchId: activeBranchId, year: period.year, month: period.month }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar folha.");
    }
  }

  async function loadSummary() {
    try {
      setSummary(await apiGet("/api/payroll/summary", { branchId: activeBranchId, year: period.year, month: period.month }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar resumo.");
    }
  }

  async function loadClosures() {
    try {
      setClosures(await apiGet("/api/payroll/closures", { year: period.year, month: period.month }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar status da folha.");
    }
  }

  useEffect(() => {
    setRecords(null);
    setSummary(null);
    loadRecords();
    loadSummary();
    loadClosures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, period.year, period.month]);

  useEffect(() => {
    apiGet("/api/employees", { branchId: activeBranchId }).then(setEmployees).catch(() => {});
  }, [activeBranchId]);

  const currentBranchClosure = closures?.branches.find((b) => b.branch_id === activeBranchId) ?? null;
  const isClosed = isNetworkScope ? !!closures?.all_closed : !!currentBranchClosure?.closed;
  const canEditPayroll = isAdmin || !isClosed;

  async function handleCloseOrReopen(close: boolean) {
    const label = isNetworkScope ? "a rede toda" : "esta filial";
    if (!confirm(`${close ? "Fechar" : "Reabrir"} a folha de ${period.month}/${period.year} para ${label}?`)) return;
    try {
      const payload = { branch_id: isNetworkScope ? null : activeBranchId, period_year: period.year, period_month: period.month };
      if (close) {
        await apiPost("/api/payroll/closures", payload);
      } else {
        await apiDelete("/api/payroll/closures", payload);
      }
      await loadClosures();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao atualizar status da folha.");
    }
  }

  function loadForEdit(record: PayrollRecordFull) {
    setEmployeeId(record.employee_id);
    setBaseSalary(String(record.base_salary));
    setBenefits(record.benefits.map((b) => ({ name: b.name, value: String(b.value) })));
    setDeductions(record.deductions.map((d) => ({ name: d.name, value: String(d.value) })));
  }

  function resetForm() {
    setEmployeeId("");
    setBaseSalary("");
    setBenefits([]);
    setDeductions([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/payroll/records", {
        employee_id: employeeId,
        period_year: period.year,
        period_month: period.month,
        base_salary: Number(baseSalary),
        benefits: benefits.filter((b) => b.name).map((b) => ({ name: b.name, value: Number(b.value) || 0 })),
        deductions: deductions.filter((d) => d.name).map((d) => ({ name: d.name, value: Number(d.value) || 0 })),
      });
      resetForm();
      await Promise.all([loadRecords(), loadSummary()]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao lançar folha.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento de folha?")) return;
    try {
      await apiDelete(`/api/payroll/records/${id}`);
      await Promise.all([loadRecords(), loadSummary()]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <div>
      <h1>Folha de pagamento</h1>
      <ScopeIndicator />
      <div className="toolbar">
        <PeriodSelector {...period} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {closures && (
            <span className="badge" data-status={isClosed ? "critico" : "ok"}>
              {isClosed ? "Folha fechada" : "Folha aberta"}
            </span>
          )}
          <a href={`/api/payroll/report?branchId=${activeBranchId}&year=${period.year}&month=${period.month}`} target="_blank" rel="noopener noreferrer">
            Relatório (PDF)
          </a>
          {isAdmin && (
            <button type="button" onClick={() => handleCloseOrReopen(!isClosed)}>
              {isClosed ? "Reabrir folha" : "Fechar folha"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}

      {summary && (
        <section className="section">
          <div className="card-grid">
            <div className="card">
              <div className="value">{money(summary.current.base_salary)}</div>
              <div className="label">Salário base total</div>
            </div>
            <div className="card">
              <div className="value">{money(summary.current.benefits)}</div>
              <div className="label">Benefícios</div>
            </div>
            <div className="card">
              <div className="value">{money(summary.current.deductions)}</div>
              <div className="label">Descontos</div>
            </div>
            <div className="card">
              <div className="value">{money(summary.current.net)}</div>
              <div className="label">Total líquido ({summary.current.employee_count} colaboradores)</div>
            </div>
            <div className="card">
              <div className="value">
                {summary.variation_pct === null ? "-" : `${summary.variation_pct >= 0 ? "+" : ""}${summary.variation_pct.toFixed(1)}%`}
              </div>
              <div className="label">Variação vs. mês anterior</div>
            </div>
          </div>

          {isNetworkScope && summary.by_branch.length > 0 && (
            <>
              <h3>Total líquido por filial</h3>
              <table>
                <thead>
                  <tr>
                    <th>Filial</th>
                    <th>Total líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.by_branch.map((b) => (
                    <tr key={b.branch_id}>
                      <td>{b.branch_name}</td>
                      <td>{money(b.net)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      <section className="section">
        <h2>Lançar folha do período</h2>
        {!canEditPayroll ? (
          <p className="muted">
            A folha deste período está fechada para este escopo. Somente um admin pode lançar, editar ou excluir, ou
            reabrir a folha acima.
          </p>
        ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="pr-employee">Colaborador</label>
              <select id="pr-employee" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="" disabled>
                  Selecione...
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="pr-base">Salário base (R$)</label>
              <input
                id="pr-base"
                type="number"
                min={0}
                step="0.01"
                required
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
              />
            </div>
          </div>

          <LineItemsEditor title="Benefícios" items={benefits} setItems={setBenefits} />
          <LineItemsEditor title="Descontos" items={deductions} setItems={setDeductions} />

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Salvar lançamento
            </button>
            <button type="button" onClick={resetForm}>
              Limpar
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            Lançar de novo para o mesmo colaborador/período substitui benefícios e descontos anteriores.
          </p>
        </form>
        )}
      </section>

      <section className="section">
        <h2>Lançamentos do período</h2>
        {!records ? (
          <p className="muted">Carregando...</p>
        ) : records.length === 0 ? (
          <p className="muted">Nenhum lançamento neste período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Salário base</th>
                <th>Benefícios</th>
                <th>Descontos</th>
                <th>Líquido</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => {
                const benefitsSum = r.benefits.reduce((a, b) => a + Number(b.value), 0);
                const deductionsSum = r.deductions.reduce((a, d) => a + Number(d.value), 0);
                return (
                  <tr key={r.id}>
                    <td>{r.employee?.name ?? "-"}</td>
                    <td>{money(Number(r.base_salary))}</td>
                    <td>{money(benefitsSum)}</td>
                    <td>{money(deductionsSum)}</td>
                    <td>{money(Number(r.base_salary) + benefitsSum - deductionsSum)}</td>
                    <td>
                      {canEditPayroll && (
                        <>
                          <button onClick={() => loadForEdit(r)}>Carregar no form</button>{" "}
                          <button className="danger" onClick={() => handleDelete(r.id)}>
                            Excluir
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function LineItemsEditor({
  title,
  items,
  setItems,
}: {
  title: string;
  items: LineItem[];
  setItems: (items: LineItem[]) => void;
}) {
  return (
    <div className="field">
      <label>{title}</label>
      {items.map((item, idx) => (
        <div key={idx} className="form-row" style={{ marginBottom: "0.35rem" }}>
          <input
            placeholder="Descrição"
            value={item.name}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], name: e.target.value };
              setItems(next);
            }}
          />
          <input
            type="number"
            step="0.01"
            placeholder="Valor"
            value={item.value}
            onChange={(e) => {
              const next = [...items];
              next[idx] = { ...next[idx], value: e.target.value };
              setItems(next);
            }}
          />
          <button type="button" onClick={() => setItems(items.filter((_, i) => i !== idx))}>
            Remover
          </button>
        </div>
      ))}
      <button type="button" onClick={() => setItems([...items, { name: "", value: "" }])}>
        + adicionar {title.toLowerCase()}
      </button>
    </div>
  );
}
