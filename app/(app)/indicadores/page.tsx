"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { apiGet, apiPost, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import { PeriodSelector, useCurrentPeriod } from "@/components/period-selector";

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function pct(n: number | null) {
  return n === null ? "-" : `${n.toFixed(1)}%`;
}

interface SeriesPoint {
  year: number;
  month: number;
  rate_pct: number | null;
}
interface BranchRate {
  branch_id: string;
  branch_name: string;
  rate_pct: number | null;
}
interface TrainingInvestmentItem {
  id: string;
  name: string;
  cost: number;
  training_date: string;
  roi_score: number | null;
  roi_notes: string | null;
  branch: { name: string } | null;
}
interface EnpsHistoryPoint {
  survey_id: string;
  year: number;
  month: number;
  responses: number;
  enps: number | null;
}
interface EnpsSurvey {
  id: string;
  period_year: number;
  period_month: number;
  branch: { name: string } | null;
}

export default function IndicadoresPage() {
  const { activeBranchId, isNetworkScope } = useBranch();
  const period = useCurrentPeriod();

  const [turnover, setTurnover] = useState<{ series: SeriesPoint[]; by_branch: BranchRate[] } | null>(null);
  const [absenteeism, setAbsenteeism] = useState<{ series: SeriesPoint[]; by_branch: BranchRate[] } | null>(null);
  const [hrCost, setHrCost] = useState<{ payroll: number; benefits: number; training: number; other: number; total: number } | null>(null);
  const [trainingRoi, setTrainingRoi] = useState<{ items: TrainingInvestmentItem[]; average_roi_score: number | null; total_cost: number } | null>(null);
  const [enpsHistory, setEnpsHistory] = useState<EnpsHistoryPoint[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [otherCostForm, setOtherCostForm] = useState({ category: "", amount: "", notes: "" });
  const [trainingForm, setTrainingForm] = useState({ name: "", cost: "", training_date: "", roi_score: "", roi_notes: "" });
  const [enpsForm, setEnpsForm] = useState({ score: "5" });
  const [surveys, setSurveys] = useState<EnpsSurvey[]>([]);
  const [selectedSurveyId, setSelectedSurveyId] = useState("");

  async function loadAll() {
    try {
      const [t, a, h, tr, e, s] = await Promise.all([
        apiGet("/api/indicators/turnover", { branchId: activeBranchId }),
        apiGet("/api/indicators/absenteeism", { branchId: activeBranchId }),
        apiGet("/api/indicators/hr-cost", { branchId: activeBranchId, year: period.year, month: period.month }),
        apiGet("/api/indicators/training-roi", { branchId: activeBranchId }),
        apiGet("/api/indicators/enps", { branchId: activeBranchId }),
        apiGet("/api/indicators/enps/surveys", { branchId: activeBranchId }),
      ]);
      setTurnover(t);
      setAbsenteeism(a);
      setHrCost(h);
      setTrainingRoi(tr);
      setEnpsHistory(e);
      setSurveys(s);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar indicadores.");
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId, period.year, period.month]);

  async function submitOtherCost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiPost("/api/indicators/other-costs", {
        branch_id: isNetworkScope ? null : activeBranchId,
        period_year: period.year,
        period_month: period.month,
        category: otherCostForm.category,
        amount: Number(otherCostForm.amount),
        notes: otherCostForm.notes || null,
      });
      setOtherCostForm({ category: "", amount: "", notes: "" });
      await loadAll();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao lançar custo.");
    }
  }

  async function submitTraining(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await apiPost("/api/indicators/training-roi", {
        branch_id: isNetworkScope ? null : activeBranchId,
        name: trainingForm.name,
        cost: Number(trainingForm.cost),
        training_date: trainingForm.training_date,
        roi_score: trainingForm.roi_score ? Number(trainingForm.roi_score) : null,
        roi_notes: trainingForm.roi_notes || null,
      });
      setTrainingForm({ name: "", cost: "", training_date: "", roi_score: "", roi_notes: "" });
      await loadAll();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao registrar investimento em treinamento.");
    }
  }

  async function deleteTraining(id: string) {
    if (!confirm("Excluir este investimento?")) return;
    try {
      await apiDelete(`/api/indicators/training-roi/${id}`);
      await loadAll();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir.");
    }
  }

  async function createSurvey() {
    try {
      const survey = await apiPost("/api/indicators/enps/surveys", {
        branch_id: isNetworkScope ? null : activeBranchId,
        period_year: period.year,
        period_month: period.month,
      });
      setSelectedSurveyId(survey.id);
      await loadAll();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao criar pesquisa.");
    }
  }

  async function submitEnpsResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSurveyId) {
      setError("Crie ou selecione uma pesquisa antes de lançar respostas.");
      return;
    }
    try {
      await apiPost("/api/indicators/enps/responses", {
        survey_id: selectedSurveyId,
        score: Number(enpsForm.score),
      });
      await loadAll();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao registrar resposta.");
    }
  }

  return (
    <div>
      <h1>Indicadores estratégicos</h1>
      <ScopeIndicator />
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Turnover</h2>
        {!turnover ? (
          <p className="muted">Carregando...</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  {turnover.series.map((p) => (
                    <th key={`${p.year}-${p.month}`}>
                      {MONTH_ABBR[p.month - 1]}/{String(p.year).slice(2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {turnover.series.map((p) => (
                    <td key={`${p.year}-${p.month}`}>{pct(p.rate_pct)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
            {isNetworkScope && turnover.by_branch.length > 0 && (
              <>
                <h3>Turnover por filial (mês atual)</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Filial</th>
                      <th>Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnover.by_branch.map((b) => (
                      <tr key={b.branch_id}>
                        <td>{b.branch_name}</td>
                        <td>{pct(b.rate_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </section>

      <section className="section">
        <h2>Absenteísmo</h2>
        {!absenteeism ? (
          <p className="muted">Carregando...</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  {absenteeism.series.map((p) => (
                    <th key={`${p.year}-${p.month}`}>
                      {MONTH_ABBR[p.month - 1]}/{String(p.year).slice(2)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {absenteeism.series.map((p) => (
                    <td key={`${p.year}-${p.month}`}>{pct(p.rate_pct)}</td>
                  ))}
                </tr>
              </tbody>
            </table>
            {isNetworkScope && absenteeism.by_branch.length > 0 && (
              <>
                <h3>Absenteísmo por filial (mês atual)</h3>
                <table>
                  <thead>
                    <tr>
                      <th>Filial</th>
                      <th>Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {absenteeism.by_branch.map((b) => (
                      <tr key={b.branch_id}>
                        <td>{b.branch_name}</td>
                        <td>{pct(b.rate_pct)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </>
        )}
      </section>

      <section className="section">
        <h2>Custo total de RH</h2>
        <PeriodSelector {...period} />
        {hrCost && (
          <>
            <div className="card-grid">
              <div className="card">
                <div className="value">{money(hrCost.payroll)}</div>
                <div className="label">Folha (salário base)</div>
              </div>
              <div className="card">
                <div className="value">{money(hrCost.benefits)}</div>
                <div className="label">Benefícios</div>
              </div>
              <div className="card">
                <div className="value">{money(hrCost.training)}</div>
                <div className="label">Treinamentos</div>
              </div>
              <div className="card">
                <div className="value">{money(hrCost.other)}</div>
                <div className="label">Outros custos</div>
              </div>
              <div className="card">
                <div className="value">{money(hrCost.total)}</div>
                <div className="label">Total</div>
              </div>
            </div>
            <h3>Lançar outro custo de RH</h3>
            <form onSubmit={submitOtherCost}>
              <div className="form-row">
                <div className="field">
                  <label htmlFor="oc-category">Categoria</label>
                  <input
                    id="oc-category"
                    required
                    value={otherCostForm.category}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, category: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="oc-amount">Valor (R$)</label>
                  <input
                    id="oc-amount"
                    type="number"
                    step="0.01"
                    required
                    value={otherCostForm.amount}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, amount: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="oc-notes">Observações</label>
                  <input
                    id="oc-notes"
                    value={otherCostForm.notes}
                    onChange={(e) => setOtherCostForm({ ...otherCostForm, notes: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-actions">
                <button type="submit">Lançar</button>
              </div>
            </form>
          </>
        )}
      </section>

      <section className="section">
        <h2>ROI de treinamentos</h2>
        {trainingRoi && (
          <div className="card-grid">
            <div className="card">
              <div className="value">{money(trainingRoi.total_cost)}</div>
              <div className="label">Investido no total</div>
            </div>
            <div className="card">
              <div className="value">{trainingRoi.average_roi_score !== null ? trainingRoi.average_roi_score.toFixed(1) : "-"}</div>
              <div className="label">Nota média de retorno percebido (0-10)</div>
            </div>
          </div>
        )}
        <h3>Registrar investimento em treinamento</h3>
        <form onSubmit={submitTraining}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="tri-name">Treinamento</label>
              <input
                id="tri-name"
                required
                value={trainingForm.name}
                onChange={(e) => setTrainingForm({ ...trainingForm, name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="tri-cost">Custo (R$)</label>
              <input
                id="tri-cost"
                type="number"
                step="0.01"
                required
                value={trainingForm.cost}
                onChange={(e) => setTrainingForm({ ...trainingForm, cost: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="tri-date">Data</label>
              <input
                id="tri-date"
                type="date"
                required
                value={trainingForm.training_date}
                onChange={(e) => setTrainingForm({ ...trainingForm, training_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="tri-roi">Nota de retorno (0-10)</label>
              <input
                id="tri-roi"
                type="number"
                min={0}
                max={10}
                step="0.1"
                value={trainingForm.roi_score}
                onChange={(e) => setTrainingForm({ ...trainingForm, roi_score: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="tri-notes">Observações sobre o retorno</label>
            <input
              id="tri-notes"
              value={trainingForm.roi_notes}
              onChange={(e) => setTrainingForm({ ...trainingForm, roi_notes: e.target.value })}
            />
          </div>
          <div className="form-actions">
            <button type="submit">Registrar</button>
          </div>
        </form>

        {trainingRoi && trainingRoi.items.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Treinamento</th>
                <th>Filial</th>
                <th>Data</th>
                <th>Custo</th>
                <th>Nota de retorno</th>
                <th>Observações</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trainingRoi.items.map((t) => (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.branch?.name ?? "Rede toda"}</td>
                  <td>{new Date(t.training_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{money(Number(t.cost))}</td>
                  <td>{t.roi_score ?? "-"}</td>
                  <td>{t.roi_notes || "-"}</td>
                  <td>
                    <button className="danger" onClick={() => deleteTraining(t.id)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2>eNPS (clima organizacional)</h2>
        {enpsHistory && enpsHistory.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>Período</th>
                <th>Respostas</th>
                <th>eNPS</th>
              </tr>
            </thead>
            <tbody>
              {enpsHistory.map((h) => (
                <tr key={h.survey_id}>
                  <td>
                    {MONTH_ABBR[h.month - 1]}/{h.year}
                  </td>
                  <td>{h.responses}</td>
                  <td>{h.enps === null ? "-" : h.enps.toFixed(0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <h3>Nova pesquisa / lançar resposta</h3>
        <div className="form-row" style={{ alignItems: "flex-end" }}>
          <div className="field">
            <label htmlFor="enps-survey">Pesquisa do período atual</label>
            <select id="enps-survey" value={selectedSurveyId} onChange={(e) => setSelectedSurveyId(e.target.value)}>
              <option value="">Selecione...</option>
              {surveys.map((s) => (
                <option key={s.id} value={s.id}>
                  {MONTH_ABBR[s.period_month - 1]}/{s.period_year} - {s.branch?.name ?? "Rede toda"}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: "0 0 auto" }}>
            <button type="button" onClick={createSurvey}>
              + Criar pesquisa para {MONTH_ABBR[period.month - 1]}/{period.year}
            </button>
          </div>
        </div>
        <form onSubmit={submitEnpsResponse} className="form-row" style={{ alignItems: "flex-end" }}>
          <div className="field">
            <label htmlFor="enps-score">Nota da resposta (0-10)</label>
            <input
              id="enps-score"
              type="number"
              min={0}
              max={10}
              value={enpsForm.score}
              onChange={(e) => setEnpsForm({ score: e.target.value })}
            />
          </div>
          <div className="field" style={{ flex: "0 0 auto" }}>
            <button type="submit">Lançar resposta</button>
          </div>
        </form>
      </section>
    </div>
  );
}
