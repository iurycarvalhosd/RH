"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import { PeriodSelector, useCurrentPeriod } from "@/components/period-selector";
import type { EmployeeRefLite, TimeEntryWithEmployee } from "@/lib/client/shared-types";

const statusLabel: Record<string, string> = { ok: "Dentro do limite", atencao: "Atenção", acima: "Acima do limite" };

export default function PontoPage() {
  const { activeBranchId } = useBranch();
  const isAdmin = useIsAdmin();
  const period = useCurrentPeriod();
  const [summary, setSummary] = useState<
    Array<{
      employee_id: string;
      employee_name: string;
      branch_name: string;
      period_overtime_hours: number;
      cumulative_balance_hours: number;
      limit_hours: number;
      status: "ok" | "atencao" | "acima";
    }> | null
  >(null);
  const [entries, setEntries] = useState<TimeEntryWithEmployee[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeRefLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ employee_id: "", entry_date: "", hours_worked: "8", overtime_hours: "0", notes: "" });
  const [saving, setSaving] = useState(false);

  async function loadSummary() {
    try {
      setSummary(await apiGet("/api/hour-bank", { branchId: activeBranchId, year: period.year, month: period.month }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar banco de horas.");
    }
  }

  async function loadEntries() {
    try {
      setEntries(await apiGet("/api/time-entries", { branchId: activeBranchId, year: period.year, month: period.month }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar lançamentos.");
    }
  }

  useEffect(() => {
    setSummary(null);
    setEntries(null);
    loadSummary();
    loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, period.year, period.month]);

  useEffect(() => {
    apiGet("/api/employees", { branchId: activeBranchId })
      .then((data) => setEmployees(data))
      .catch(() => {});
  }, [activeBranchId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/time-entries", {
        employee_id: form.employee_id,
        entry_date: form.entry_date,
        hours_worked: Number(form.hours_worked),
        overtime_hours: Number(form.overtime_hours),
        notes: form.notes || null,
      });
      setForm({ ...form, entry_date: "", overtime_hours: "0", notes: "" });
      await Promise.all([loadSummary(), loadEntries()]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao lançar ponto.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este lançamento?")) return;
    try {
      await apiDelete(`/api/time-entries/${id}`);
      await Promise.all([loadSummary(), loadEntries()]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir lançamento.");
    }
  }

  return (
    <div>
      <h1>Ponto e banco de horas</h1>
      <ScopeIndicator />
      <PeriodSelector {...period} />
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Banco de horas por colaborador</h2>
        {!summary ? (
          <p className="muted">Carregando...</p>
        ) : summary.length === 0 ? (
          <p className="muted">Nenhum colaborador ativo neste escopo.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Filial</th>
                <th>Horas extras no período</th>
                <th>Saldo acumulado</th>
                <th>Limite configurado</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row) => (
                <tr key={row.employee_id}>
                  <td>{row.employee_name}</td>
                  <td>{row.branch_name}</td>
                  <td>{row.period_overtime_hours.toFixed(1)}h</td>
                  <td>{row.cumulative_balance_hours.toFixed(1)}h</td>
                  <td>{row.limit_hours.toFixed(1)}h</td>
                  <td>
                    <span className="badge" data-status={row.status}>
                      {statusLabel[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2>Lançar ponto</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="employee_id">Colaborador</label>
              <select
                id="employee_id"
                required
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              >
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
              <label htmlFor="entry_date">Data</label>
              <input
                id="entry_date"
                type="date"
                required
                value={form.entry_date}
                onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="hours_worked">Horas trabalhadas</label>
              <input
                id="hours_worked"
                type="number"
                min={0}
                step="0.5"
                value={form.hours_worked}
                onChange={(e) => setForm({ ...form, hours_worked: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="overtime_hours">Horas extras</label>
              <input
                id="overtime_hours"
                type="number"
                min={0}
                step="0.5"
                value={form.overtime_hours}
                onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="notes">Observações</label>
            <input id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Lançar
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            Lançar de novo na mesma data para o mesmo colaborador substitui o registro anterior daquele dia.
          </p>
        </form>
      </section>

      <section className="section">
        <h2>Lançamentos do período</h2>
        {!entries ? (
          <p className="muted">Carregando...</p>
        ) : entries.length === 0 ? (
          <p className="muted">Nenhum lançamento neste período.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Colaborador</th>
                <th>Horas trabalhadas</th>
                <th>Horas extras</th>
                <th>Origem</th>
                <th>Observações</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{new Date(entry.entry_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{entry.employee?.name ?? "-"}</td>
                  <td>{Number(entry.hours_worked).toFixed(1)}h</td>
                  <td>{Number(entry.overtime_hours).toFixed(1)}h</td>
                  <td>{entry.source === "manual" ? "Manual" : "Importado"}</td>
                  <td>{entry.notes || "-"}</td>
                  {isAdmin && (
                    <td>
                      <button className="danger" onClick={() => handleDelete(entry.id)}>
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
