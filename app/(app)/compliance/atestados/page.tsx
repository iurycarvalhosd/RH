"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import type { AttestationWithEmployee, EmployeeRefLite } from "@/lib/client/shared-types";

const statusLabel: Record<string, string> = { aprovado: "Aprovado", pendente: "Pendente", rejeitado: "Rejeitado" };
const statusBadge: Record<string, string> = { aprovado: "ok", pendente: "atencao", rejeitado: "critico" };

export default function AtestadosPage() {
  const { activeBranchId } = useBranch();
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<AttestationWithEmployee[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeRefLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ employee_id: "", start_date: "", end_date: "", reason: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await apiGet("/api/compliance/attestations", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar atestados.");
    }
  }

  useEffect(() => {
    setItems(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  useEffect(() => {
    apiGet("/api/employees", { branchId: activeBranchId }).then(setEmployees).catch(() => {});
  }, [activeBranchId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/compliance/attestations", form);
      setForm({ employee_id: "", start_date: "", end_date: "", reason: "" });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao registrar atestado.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      await apiPut(`/api/compliance/attestations/${id}`, { status });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao atualizar status.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este atestado?")) return;
    try {
      await apiDelete(`/api/compliance/attestations/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Novo atestado</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="at-employee">Colaborador</label>
              <select
                id="at-employee"
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
              <label htmlFor="at-start">Início</label>
              <input
                id="at-start"
                type="date"
                required
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="at-end">Fim</label>
              <input
                id="at-end"
                type="date"
                required
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="at-reason">Tipo/motivo</label>
            <input
              id="at-reason"
              required
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Registrar
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Atestados</h2>
        {!items ? (
          <p className="muted">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="muted">Nenhum atestado registrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Período</th>
                <th>Motivo</th>
                <th>Status</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.employee?.name ?? "-"}</td>
                  <td>
                    {new Date(it.start_date + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                    {new Date(it.end_date + "T00:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td>{it.reason}</td>
                  <td>
                    {isAdmin ? (
                      <select value={it.status} onChange={(e) => handleStatusChange(it.id, e.target.value)}>
                        <option value="pendente">Pendente</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="rejeitado">Rejeitado</option>
                      </select>
                    ) : (
                      <span className="badge" data-status={statusBadge[it.status]}>
                        {statusLabel[it.status]}
                      </span>
                    )}
                  </td>
                  {isAdmin && (
                    <td>
                      <button className="danger" onClick={() => handleDelete(it.id)}>
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
