"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import { DEFAULT_EXIT_INTERVIEW_QUESTIONS } from "@/lib/types";
import type { EmployeeWithRefs } from "@/lib/types";
import type { TerminationFull } from "@/lib/client/shared-types";

const reasonLabel: Record<string, string> = { voluntario: "Voluntário", involuntario: "Involuntário" };

export default function DesligamentosPage() {
  const { activeBranchId } = useBranch();
  const isAdmin = useIsAdmin();
  const [terminations, setTerminations] = useState<TerminationFull[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithRefs[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [terminationDate, setTerminationDate] = useState("");
  const [reasonType, setReasonType] = useState<"voluntario" | "involuntario">("voluntario");
  const [reasonNotes, setReasonNotes] = useState("");
  const [answers, setAnswers] = useState<string[]>(DEFAULT_EXIT_INTERVIEW_QUESTIONS.map(() => ""));
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setTerminations(await apiGet("/api/terminations", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar desligamentos.");
    }
  }

  useEffect(() => {
    setTerminations(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  useEffect(() => {
    apiGet("/api/employees", { branchId: activeBranchId, status: "active" }).then(setEmployees).catch(() => {});
  }, [activeBranchId]);

  function resetForm() {
    setEmployeeId("");
    setTerminationDate("");
    setReasonType("voluntario");
    setReasonNotes("");
    setAnswers(DEFAULT_EXIT_INTERVIEW_QUESTIONS.map(() => ""));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/terminations", {
        employee_id: employeeId,
        termination_date: terminationDate,
        reason_type: reasonType,
        reason_notes: reasonNotes || null,
        exit_interview: DEFAULT_EXIT_INTERVIEW_QUESTIONS.map((question, idx) => ({
          question,
          answer: answers[idx] || null,
        })),
      });
      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao registrar desligamento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este registro de desligamento?")) return;
    try {
      await apiDelete(`/api/terminations/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir.");
    }
  }

  return (
    <div>
      <h1>Desligamentos</h1>
      <ScopeIndicator />
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Novo desligamento</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="term-employee">Colaborador</label>
              <select id="term-employee" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
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
              <label htmlFor="term-date">Data</label>
              <input
                id="term-date"
                type="date"
                required
                value={terminationDate}
                onChange={(e) => setTerminationDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="term-reason">Motivo</label>
              <select
                id="term-reason"
                value={reasonType}
                onChange={(e) => setReasonType(e.target.value as "voluntario" | "involuntario")}
              >
                <option value="voluntario">Voluntário</option>
                <option value="involuntario">Involuntário</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="term-notes">Observações sobre o motivo</label>
            <textarea id="term-notes" rows={2} value={reasonNotes} onChange={(e) => setReasonNotes(e.target.value)} />
          </div>

          <h3>Entrevista de saída</h3>
          {DEFAULT_EXIT_INTERVIEW_QUESTIONS.map((q, idx) => (
            <div className="field" key={q}>
              <label>{q}</label>
              <textarea
                rows={2}
                value={answers[idx]}
                onChange={(e) => {
                  const next = [...answers];
                  next[idx] = e.target.value;
                  setAnswers(next);
                }}
              />
            </div>
          ))}

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Registrar desligamento
            </button>
          </div>
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            Ao registrar, o colaborador é marcado como inativo automaticamente.
          </p>
        </form>
      </section>

      <section className="section">
        <h2>Histórico de desligamentos</h2>
        {!terminations ? (
          <p className="muted">Carregando...</p>
        ) : terminations.length === 0 ? (
          <p className="muted">Nenhum desligamento registrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Data</th>
                <th>Motivo</th>
                <th>Observações</th>
                <th></th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {terminations.map((t) => (
                <Fragment key={t.id}>
                  <tr>
                    <td>{t.employee?.name ?? "-"}</td>
                    <td>{new Date(t.termination_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td>{reasonLabel[t.reason_type]}</td>
                    <td>{t.reason_notes || "-"}</td>
                    <td>
                      <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                        {expanded === t.id ? "Ocultar entrevista" : "Ver entrevista"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="danger" onClick={() => handleDelete(t.id)}>
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                  {expanded === t.id && (
                    <tr>
                      <td colSpan={isAdmin ? 6 : 5}>
                        <strong>Entrevista de saída</strong>
                        <ul>
                          {t.exit_interview_answers.map((a) => (
                            <li key={a.id}>
                              <strong>{a.question}:</strong> {a.answer || "-"}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
