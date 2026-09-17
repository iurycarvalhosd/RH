"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import { PerformanceTemplatesManager } from "./performance-templates-manager";
import type { PerformanceReviewWithEmployee, PerformanceReviewTemplateWithCriteria } from "@/lib/client/shared-types";
import type { EmployeeWithRefs, FunctionCategory, JobPosition } from "@/lib/types";

const functionCategoryLabel: Record<FunctionCategory, string> = {
  administrativo: "Administrativo",
  comercial: "Comercial",
  producao: "Produção",
  servicos_gerais: "Serviços gerais",
};

interface CriteriaValue {
  score: string;
  comment: string;
}

export default function DesempenhoPage() {
  const { activeBranchId } = useBranch();
  const isAdmin = useIsAdmin();
  const [reviews, setReviews] = useState<PerformanceReviewWithEmployee[] | null>(null);
  const [summary, setSummary] = useState<{ average: number | null; count: number; scale_min: number; scale_max: number } | null>(null);
  const [employees, setEmployees] = useState<EmployeeWithRefs[]>([]);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [templates, setTemplates] = useState<PerformanceReviewTemplateWithCriteria[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState("");
  const [reviewDate, setReviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [freeScore, setFreeScore] = useState("");
  const [templateChoice, setTemplateChoice] = useState("auto"); // "auto" | "free" | <templateId>
  const [criteriaValues, setCriteriaValues] = useState<Record<string, CriteriaValue>>({});
  const [saving, setSaving] = useState(false);
  const [templatesReloadKey, setTemplatesReloadKey] = useState(0);

  async function loadReviews() {
    try {
      setReviews(await apiGet("/api/performance", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar avaliações.");
    }
  }

  async function loadSummary() {
    try {
      setSummary(await apiGet("/api/performance/summary", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar resumo.");
    }
  }

  async function loadTemplates() {
    try {
      setTemplates(await apiGet("/api/performance-templates"));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar modelos de avaliação.");
    }
  }

  useEffect(() => {
    setReviews(null);
    loadReviews();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  useEffect(() => {
    apiGet("/api/employees", { branchId: activeBranchId, status: "active" }).then(setEmployees).catch(() => {});
  }, [activeBranchId]);

  useEffect(() => {
    apiGet("/api/positions").then(setPositions).catch(() => {});
    loadTemplates();
  }, [templatesReloadKey]);

  const selectedEmployee = employees.find((e) => e.id === employeeId) ?? null;
  const employeeCategory = selectedEmployee?.position_id
    ? positions.find((p) => p.id === selectedEmployee.position_id)?.function_category ?? null
    : null;
  const autoTemplate = employeeCategory ? templates.find((t) => t.function_category === employeeCategory) ?? null : null;
  const effectiveTemplate =
    templateChoice === "auto" ? autoTemplate : templateChoice === "free" ? null : templates.find((t) => t.id === templateChoice) ?? null;

  function resetForm() {
    setEmployeeId("");
    setReviewDate("");
    setNotes("");
    setFreeScore("");
    setTemplateChoice("auto");
    setCriteriaValues({});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        employee_id: employeeId,
        review_date: reviewDate,
        notes: notes || null,
      };
      if (effectiveTemplate) {
        payload.template_id = effectiveTemplate.id;
        payload.criteria_scores = effectiveTemplate.criteria.map((c, idx) => ({
          label: c.label,
          score: Number(criteriaValues[c.id]?.score || 0),
          comment: criteriaValues[c.id]?.comment || null,
          sort_order: idx,
        }));
      } else {
        payload.score = Number(freeScore);
      }
      await apiPost("/api/performance", payload);
      resetForm();
      await Promise.all([loadReviews(), loadSummary()]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao registrar avaliação.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta avaliação?")) return;
    try {
      await apiDelete(`/api/performance/${id}`);
      await Promise.all([loadReviews(), loadSummary()]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir avaliação.");
    }
  }

  const scaleHint = summary ? ` (${summary.scale_min}-${summary.scale_max})` : "";

  return (
    <div>
      <h1>Desempenho</h1>
      <ScopeIndicator />
      {error && <p className="error-text">{error}</p>}

      {summary && (
        <section className="section">
          <div className="card-grid">
            <div className="card">
              <div className="value">{summary.average !== null ? summary.average.toFixed(1) : "-"}</div>
              <div className="label">
                Nota média{scaleHint} · {summary.count} colaboradores avaliados
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="section">
        <h2>Nova avaliação</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="ev-employee">Colaborador</label>
              <select id="ev-employee" required value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                <option value="" disabled>
                  Selecione...
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.position?.title ? `(${emp.position.title})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="ev-date">Data</label>
              <input id="ev-date" type="date" required value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="ev-template">Modelo de avaliação</label>
              <select id="ev-template" value={templateChoice} onChange={(e) => setTemplateChoice(e.target.value)}>
                <option value="auto">
                  {autoTemplate ? `Automático: ${autoTemplate.name}` : "Automático (nenhum modelo para o cargo)"}
                </option>
                <option value="free">Avaliação livre (nota única)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {templateNotice(employeeCategory, autoTemplate, templateChoice)}

          {effectiveTemplate ? (
            <div className="field">
              <label>Critérios ({functionCategoryLabel[effectiveTemplate.function_category]})</label>
              <table>
                <thead>
                  <tr>
                    <th>Critério</th>
                    <th style={{ width: 110 }}>Nota{scaleHint}</th>
                    <th>Comentário</th>
                  </tr>
                </thead>
                <tbody>
                  {effectiveTemplate.criteria.map((c) => (
                    <tr key={c.id}>
                      <td>
                        {c.label}
                        {c.description && <div className="muted" style={{ fontSize: "0.75rem" }}>{c.description}</div>}
                      </td>
                      <td>
                        <input
                          type="number"
                          required
                          min={summary?.scale_min}
                          max={summary?.scale_max}
                          step="0.1"
                          value={criteriaValues[c.id]?.score ?? ""}
                          onChange={(e) =>
                            setCriteriaValues({
                              ...criteriaValues,
                              [c.id]: { score: e.target.value, comment: criteriaValues[c.id]?.comment ?? "" },
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          value={criteriaValues[c.id]?.comment ?? ""}
                          onChange={(e) =>
                            setCriteriaValues({
                              ...criteriaValues,
                              [c.id]: { score: criteriaValues[c.id]?.score ?? "", comment: e.target.value },
                            })
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted" style={{ fontSize: "0.8rem" }}>
                A nota final da avaliação é a média dos critérios acima.
              </p>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="ev-score">Nota{scaleHint}</label>
              <input
                id="ev-score"
                type="number"
                step="0.1"
                required
                value={freeScore}
                onChange={(e) => setFreeScore(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label htmlFor="ev-notes">Observações gerais</label>
            <textarea id="ev-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Registrar
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Histórico de avaliações</h2>
        {!reviews ? (
          <p className="muted">Carregando...</p>
        ) : reviews.length === 0 ? (
          <p className="muted">Nenhuma avaliação registrada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Data</th>
                <th>Nota</th>
                <th>Modelo</th>
                <th>Observações</th>
                <th></th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {reviews.map((r) => (
                <Fragment key={r.id}>
                  <tr>
                    <td>{r.employee?.name ?? "-"}</td>
                    <td>{new Date(r.review_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                    <td>{r.score.toFixed(1)}</td>
                    <td>{r.template_id ? templates.find((t) => t.id === r.template_id)?.name ?? "Modelo" : "Livre"}</td>
                    <td>{r.notes || "-"}</td>
                    <td>
                      {!!r.criteria_scores?.length && (
                        <button onClick={() => setExpandedReviewId(expandedReviewId === r.id ? null : r.id)}>
                          {expandedReviewId === r.id ? "Ocultar" : "Ver critérios"}
                        </button>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        <button className="danger" onClick={() => handleDelete(r.id)}>
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                  {expandedReviewId === r.id && r.criteria_scores && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6}>
                        <table>
                          <thead>
                            <tr>
                              <th>Critério</th>
                              <th>Nota</th>
                              <th>Comentário</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.criteria_scores.map((c) => (
                              <tr key={c.id}>
                                <td>{c.label}</td>
                                <td>{c.score}</td>
                                <td>{c.comment || "-"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2>Modelos de avaliação por categoria de função</h2>
        <p className="muted">
          Modelos padronizados com base em práticas de avaliação por competências amplamente usadas em RH (não existe
          uma norma única do governo para avaliação de desempenho, diferente de EPI/treinamentos de segurança). Ajuste
          os critérios conforme a realidade da empresa.
        </p>
        <PerformanceTemplatesManager templates={templates} onChanged={() => setTemplatesReloadKey((k) => k + 1)} />
      </section>
    </div>
  );
}

function templateNotice(
  category: FunctionCategory | null,
  autoTemplate: PerformanceReviewTemplateWithCriteria | null,
  templateChoice: string
) {
  if (templateChoice !== "auto" || autoTemplate) return null;
  return (
    <p className="muted" style={{ fontSize: "0.8rem" }}>
      {category
        ? `Nenhum modelo cadastrado para a categoria "${functionCategoryLabel[category]}" ainda — usando avaliação livre.`
        : "Selecione um colaborador com cargo categorizado para sugerir um modelo automaticamente, ou escolha um modelo manualmente."}
    </p>
  );
}
