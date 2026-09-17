"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import type { EmployeeWithRefs, JobPosition } from "@/lib/types";

function emptyForm(defaultBranchId: string) {
  return {
    branch_id: defaultBranchId,
    position_id: "",
    name: "",
    hire_date: "",
    status: "active" as "active" | "inactive",
    email: "",
    phone: "",
  };
}

export default function EquipePage() {
  const { activeBranchId, isNetworkScope, branches } = useBranch();
  const isAdmin = useIsAdmin();
  const [employees, setEmployees] = useState<EmployeeWithRefs[] | null>(null);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(isNetworkScope ? "" : activeBranchId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setEmployees(await apiGet("/api/employees", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar equipe.");
    }
  }

  useEffect(() => {
    setEmployees(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  useEffect(() => {
    apiGet("/api/positions").then(setPositions).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editingId) setForm(emptyForm(isNetworkScope ? "" : activeBranchId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  function startEdit(emp: EmployeeWithRefs) {
    setEditingId(emp.id);
    setForm({
      branch_id: emp.branch_id,
      position_id: emp.position_id ?? "",
      name: emp.name,
      hire_date: emp.hire_date,
      status: emp.status,
      email: emp.email ?? "",
      phone: emp.phone ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(isNetworkScope ? "" : activeBranchId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      position_id: form.position_id || null,
      email: form.email || null,
    };
    try {
      if (editingId) {
        await apiPut(`/api/employees/${editingId}`, payload);
      } else {
        await apiPost("/api/employees", payload);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao salvar colaborador.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este colaborador? Todos os registros ligados a ele também serão removidos.")) return;
    try {
      await apiDelete(`/api/employees/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir colaborador.");
    }
  }

  return (
    <div>
      <h1>Equipe</h1>
      <ScopeIndicator />
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>{editingId ? "Editar colaborador" : "Novo colaborador"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="name">Nome</label>
              <input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="branch_id">Filial</label>
              <select
                id="branch_id"
                required
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="position_id">Cargo</label>
              <select
                id="position_id"
                value={form.position_id}
                onChange={(e) => setForm({ ...form, position_id: e.target.value })}
              >
                <option value="">Sem cargo definido</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="hire_date">Data de admissão</label>
              <input
                id="hire_date"
                type="date"
                required
                value={form.hire_date}
                onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefone</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {editingId ? "Salvar" : "Cadastrar"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Colaboradores</h2>
        {!employees ? (
          <p className="muted">Carregando...</p>
        ) : employees.length === 0 ? (
          <p className="muted">Nenhum colaborador cadastrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                {isNetworkScope && <th>Filial</th>}
                <th>Cargo</th>
                <th>Admissão</th>
                <th>Status</th>
                <th>Contato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  {isNetworkScope && <td>{emp.branch?.name ?? "-"}</td>}
                  <td>{emp.position?.title ?? "-"}</td>
                  <td>{new Date(emp.hire_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>
                    <span className="badge" data-status={emp.status === "active" ? "ok" : "critico"}>
                      {emp.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    {emp.email || "-"}
                    {emp.phone ? ` / ${emp.phone}` : ""}
                  </td>
                  <td>
                    {isAdmin && (
                      <>
                        <button onClick={() => startEdit(emp)}>Editar</button>{" "}
                        <button className="danger" onClick={() => handleDelete(emp.id)}>
                          Excluir
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
