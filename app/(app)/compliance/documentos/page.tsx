"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiDelete, ClientApiError } from "@/lib/client/api";
import type { ComplianceDocumentWithEmployee, EmployeeRefLite } from "@/lib/client/shared-types";

type DocumentRow = ComplianceDocumentWithEmployee & { status: "valido" | "a_vencer" | "vencido" };

const statusLabel: Record<string, string> = { valido: "Válido", a_vencer: "A vencer", vencido: "Vencido" };
const statusBadge: Record<string, string> = { valido: "ok", a_vencer: "atencao", vencido: "critico" };

export default function DocumentosPage() {
  const { activeBranchId } = useBranch();
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<DocumentRow[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeRefLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ employee_id: "", document_type: "", expires_at: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await apiGet("/api/compliance/documents", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar documentos.");
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
      await apiPost("/api/compliance/documents", form);
      setForm({ employee_id: "", document_type: "", expires_at: "" });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao registrar documento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este documento?")) return;
    try {
      await apiDelete(`/api/compliance/documents/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Novo documento/exame</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="doc-employee">Colaborador</label>
              <select
                id="doc-employee"
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
              <label htmlFor="doc-type">Tipo (documento/exame)</label>
              <input
                id="doc-type"
                required
                placeholder="Ex.: Exame admissional, ASO periódico..."
                value={form.document_type}
                onChange={(e) => setForm({ ...form, document_type: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="doc-expires">Vencimento</label>
              <input
                id="doc-expires"
                type="date"
                required
                value={form.expires_at}
                onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Registrar
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Documentos e exames periódicos</h2>
        {!items ? (
          <p className="muted">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="muted">Nenhum documento registrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Tipo</th>
                <th>Vencimento</th>
                <th>Status</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td>{it.employee?.name ?? "-"}</td>
                  <td>{it.document_type}</td>
                  <td>{new Date(it.expires_at + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>
                    <span className="badge" data-status={statusBadge[it.status]}>
                      {statusLabel[it.status]}
                    </span>
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
