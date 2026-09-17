"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import type { EmployeeWithRefs } from "@/lib/types";
import type { OnboardingTaskWithEmployee } from "@/lib/client/shared-types";

export default function OnboardingPage() {
  const { activeBranchId } = useBranch();
  const isAdmin = useIsAdmin();
  const [employees, setEmployees] = useState<EmployeeWithRefs[] | null>(null);
  const [tasks, setTasks] = useState<OnboardingTaskWithEmployee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newTaskByEmployee, setNewTaskByEmployee] = useState<Record<string, string>>({});

  async function load() {
    try {
      const [emps, tks] = await Promise.all([
        apiGet("/api/employees", { branchId: activeBranchId, status: "active" }),
        apiGet("/api/onboarding", { branchId: activeBranchId }),
      ]);
      setEmployees(emps);
      setTasks(tks);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar onboarding.");
    }
  }

  useEffect(() => {
    setEmployees(null);
    setTasks(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  async function startOnboarding(employeeId: string) {
    try {
      await apiPost("/api/onboarding?action=seed", { employee_id: employeeId });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao iniciar onboarding.");
    }
  }

  async function toggleTask(id: string, done: boolean) {
    try {
      await apiPut(`/api/onboarding/${id}`, { done });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao atualizar tarefa.");
    }
  }

  async function addTask(employeeId: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newTaskByEmployee[employeeId]?.trim();
    if (!name) return;
    try {
      await apiPost("/api/onboarding", { employee_id: employeeId, task_name: name, sort_order: 99 });
      setNewTaskByEmployee({ ...newTaskByEmployee, [employeeId]: "" });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao adicionar tarefa.");
    }
  }

  async function removeTask(id: string) {
    if (!confirm("Remover esta tarefa?")) return;
    try {
      await apiDelete(`/api/onboarding/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao remover tarefa.");
    }
  }

  return (
    <div>
      <h1>Onboarding</h1>
      <ScopeIndicator />
      {error && <p className="error-text">{error}</p>}

      {!employees || !tasks ? (
        <p className="muted">Carregando...</p>
      ) : employees.length === 0 ? (
        <p className="muted">Nenhum colaborador ativo neste escopo.</p>
      ) : (
        employees.map((emp) => {
          const empTasks = tasks.filter((t) => t.employee_id === emp.id).sort((a, b) => a.sort_order - b.sort_order);
          const doneCount = empTasks.filter((t) => t.done).length;
          return (
            <section key={emp.id} className="section">
              <h2>
                {emp.name}{" "}
                <span className="badge" data-status="ok" style={{ fontWeight: "normal" }}>
                  {emp.contract_type === "experiencia" ? "Contrato de experiência" : "Prazo indeterminado"}
                </span>{" "}
                {empTasks.length > 0 && (
                  <span className="muted" style={{ fontWeight: "normal", fontSize: "0.85rem" }}>
                    ({doneCount}/{empTasks.length} concluídas)
                  </span>
                )}
              </h2>
              <p>
                <a href={`/api/employees/${emp.id}/contract`} target="_blank" rel="noopener noreferrer">
                  Contrato de trabalho (PDF)
                </a>
              </p>
              {empTasks.length === 0 ? (
                <button onClick={() => startOnboarding(emp.id)}>Iniciar checklist de onboarding</button>
              ) : (
                <>
                  <table>
                    <thead>
                      <tr>
                        <th>Concluído</th>
                        <th>Item</th>
                        <th>Data</th>
                        {isAdmin && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {empTasks.map((t) => (
                        <tr key={t.id}>
                          <td>
                            <input
                              type="checkbox"
                              style={{ width: "auto" }}
                              checked={t.done}
                              disabled={!isAdmin}
                              onChange={(e) => toggleTask(t.id, e.target.checked)}
                            />
                          </td>
                          <td>{t.task_name}</td>
                          <td>{t.done_at ? new Date(t.done_at).toLocaleDateString("pt-BR") : "-"}</td>
                          {isAdmin && (
                            <td>
                              <button className="danger" onClick={() => removeTask(t.id)}>
                                Remover
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <form onSubmit={(e) => addTask(emp.id, e)} style={{ display: "flex", gap: "0.4rem", maxWidth: 400 }}>
                    <input
                      placeholder="Nova tarefa"
                      value={newTaskByEmployee[emp.id] ?? ""}
                      onChange={(e) => setNewTaskByEmployee({ ...newTaskByEmployee, [emp.id]: e.target.value })}
                    />
                    <button type="submit">Adicionar</button>
                  </form>
                </>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}
