"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import type { TrainingSessionWithDetails } from "@/lib/client/shared-types";
import type { EmployeeWithRefs } from "@/lib/types";
import type { TrainingProgramWithPositions } from "@/lib/client/shared-types";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function TrainingSessions({ reloadKey }: { reloadKey: number }) {
  const { activeBranchId } = useBranch();
  const isAdmin = useIsAdmin();
  const [sessions, setSessions] = useState<TrainingSessionWithDetails[] | null>(null);
  const [programs, setPrograms] = useState<TrainingProgramWithPositions[]>([]);
  const [employees, setEmployees] = useState<EmployeeWithRefs[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    training_program_id: "",
    session_date: todayStr(),
    location: "",
    instructor: "",
    employee_ids: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setSessions(await apiGet("/api/training-sessions", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar sessões.");
    }
  }

  useEffect(() => {
    setSessions(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, reloadKey]);

  useEffect(() => {
    apiGet("/api/training-programs").then(setPrograms).catch(() => {});
    apiGet("/api/employees", { branchId: activeBranchId, status: "active" }).then(setEmployees).catch(() => {});
  }, [activeBranchId]);

  function toggleEmployee(id: string) {
    setForm((f) => ({
      ...f,
      employee_ids: f.employee_ids.includes(id) ? f.employee_ids.filter((e) => e !== id) : [...f.employee_ids, id],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/training-sessions", {
        training_program_id: form.training_program_id,
        session_date: form.session_date,
        location: form.location || null,
        instructor: form.instructor || null,
        attendees: form.employee_ids.map((employee_id) => ({ employee_id, attended: true })),
      });
      setForm({ training_program_id: "", session_date: todayStr(), location: "", instructor: "", employee_ids: [] });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao agendar sessão.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleAttendance(session: TrainingSessionWithDetails, employeeId: string, attended: boolean) {
    try {
      await apiPut(`/api/training-sessions/${session.id}`, {
        attendees: session.attendees.map((a) => ({
          employee_id: a.employee_id,
          attended: a.employee_id === employeeId ? attended : a.attended,
        })),
      });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao atualizar presença.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta sessão de treinamento?")) return;
    try {
      await apiDelete(`/api/training-sessions/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir sessão.");
    }
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="ts-program">Treinamento</label>
            <select
              id="ts-program"
              required
              value={form.training_program_id}
              onChange={(e) => setForm({ ...form, training_program_id: e.target.value })}
            >
              <option value="" disabled>
                Selecione...
              </option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="ts-date">Data</label>
            <input
              id="ts-date"
              type="date"
              required
              value={form.session_date}
              onChange={(e) => setForm({ ...form, session_date: e.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="ts-location">Local</label>
            <input id="ts-location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="ts-instructor">Instrutor/Responsável</label>
            <input
              id="ts-instructor"
              value={form.instructor}
              onChange={(e) => setForm({ ...form, instructor: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label>Participantes</label>
          {employees.length === 0 ? (
            <p className="muted">Nenhum colaborador ativo neste escopo.</p>
          ) : (
            employees.map((emp) => (
              <label key={emp.id} style={{ display: "block", fontWeight: "normal" }}>
                <input
                  type="checkbox"
                  style={{ width: "auto", display: "inline-block", marginRight: "0.4rem" }}
                  checked={form.employee_ids.includes(emp.id)}
                  onChange={() => toggleEmployee(emp.id)}
                />
                {emp.name} {emp.position?.title ? `(${emp.position.title})` : ""}
              </label>
            ))
          )}
        </div>
        <div className="form-actions">
          <button type="submit" disabled={saving}>
            Registrar sessão
          </button>
        </div>
      </form>

      {!sessions ? (
        <p className="muted">Carregando...</p>
      ) : sessions.length === 0 ? (
        <p className="muted">Nenhuma sessão registrada.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Treinamento</th>
              <th>Data</th>
              <th>Situação</th>
              <th>Participantes</th>
              <th></th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => {
              const isFuture = s.session_date >= todayStr();
              const attendedCount = s.attendees.filter((a) => a.attended).length;
              return (
                <Fragment key={s.id}>
                  <tr>
                    <td>{s.training_program?.name ?? "-"}</td>
                    <td>{new Date(s.session_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td>
                      <span className="badge" data-status={isFuture ? "atencao" : "ok"}>
                        {isFuture ? "Agendado" : "Realizado"}
                      </span>
                    </td>
                    <td>
                      {attendedCount} de {s.attendees.length}{" "}
                      <button onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}>
                        {expandedId === s.id ? "Ocultar" : "Ver lista"}
                      </button>
                    </td>
                    <td>
                      <a href={`/api/training-sessions/${s.id}/certificate`} target="_blank" rel="noopener noreferrer">
                        Ata (PDF)
                      </a>
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="danger" onClick={() => handleDelete(s.id)}>
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                  {expandedId === s.id && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5}>
                        <table>
                          <thead>
                            <tr>
                              <th>Colaborador</th>
                              <th>Cargo</th>
                              <th>Compareceu</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.attendees.map((a) => (
                              <tr key={a.id}>
                                <td>{a.employee?.name ?? "-"}</td>
                                <td>{a.employee?.position?.title ?? "-"}</td>
                                <td>
                                  {isAdmin ? (
                                    <input
                                      type="checkbox"
                                      style={{ width: "auto" }}
                                      checked={a.attended}
                                      onChange={(e) => toggleAttendance(s, a.employee_id, e.target.checked)}
                                    />
                                  ) : a.attended ? (
                                    "Sim"
                                  ) : (
                                    "Não"
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
