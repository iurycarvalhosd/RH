"use client";

import { useEffect, useState, type FormEvent } from "react";
import { apiGet, apiPut, ClientApiError } from "@/lib/client/api";
import type { AppSettings } from "@/lib/types";

export function ConfiguracoesClient() {
  const [form, setForm] = useState<AppSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiGet("/api/settings")
      .then(setForm)
      .catch((e) => setError(e instanceof ClientApiError ? e.message : "Erro ao carregar configurações."));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const updated = await apiPut("/api/settings", {
        hour_bank_limit_hours: Number(form.hour_bank_limit_hours),
        hour_bank_attention_pct: Number(form.hour_bank_attention_pct),
        vacation_alert_days: Number(form.vacation_alert_days),
        compliance_alert_days: Number(form.compliance_alert_days),
        performance_scale_min: Number(form.performance_scale_min),
        performance_scale_max: Number(form.performance_scale_max),
        payroll_variation_alert_pct: Number(form.payroll_variation_alert_pct),
      });
      setForm(updated);
      setSuccess(true);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1>Configurações</h1>
      <p className="muted">Regras usadas para calcular status e disparar alertas em todos os módulos.</p>
      {error && <p className="error-text">{error}</p>}
      {success && <p>Configurações salvas.</p>}

      {!form ? (
        <p className="muted">Carregando...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
          <div className="field">
            <label htmlFor="cf-hb-limit">Limite do banco de horas (horas)</label>
            <input
              id="cf-hb-limit"
              type="number"
              step="0.5"
              value={form.hour_bank_limit_hours}
              onChange={(e) => setForm({ ...form, hour_bank_limit_hours: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="cf-hb-attention">Alerta de atenção do banco de horas (% do limite)</label>
            <input
              id="cf-hb-attention"
              type="number"
              step="1"
              value={form.hour_bank_attention_pct}
              onChange={(e) => setForm({ ...form, hour_bank_attention_pct: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="cf-vac-days">Alerta de férias (dias antes do vencimento)</label>
            <input
              id="cf-vac-days"
              type="number"
              step="1"
              value={form.vacation_alert_days}
              onChange={(e) => setForm({ ...form, vacation_alert_days: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <label htmlFor="cf-comp-days">Alerta de compliance (dias antes do vencimento)</label>
            <input
              id="cf-comp-days"
              type="number"
              step="1"
              value={form.compliance_alert_days}
              onChange={(e) => setForm({ ...form, compliance_alert_days: Number(e.target.value) })}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="cf-scale-min">Escala de avaliação - mínimo</label>
              <input
                id="cf-scale-min"
                type="number"
                step="0.1"
                value={form.performance_scale_min}
                onChange={(e) => setForm({ ...form, performance_scale_min: Number(e.target.value) })}
              />
            </div>
            <div className="field">
              <label htmlFor="cf-scale-max">Escala de avaliação - máximo</label>
              <input
                id="cf-scale-max"
                type="number"
                step="0.1"
                value={form.performance_scale_max}
                onChange={(e) => setForm({ ...form, performance_scale_max: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="cf-payroll-pct">Alerta de variação da folha (%)</label>
            <input
              id="cf-payroll-pct"
              type="number"
              step="1"
              value={form.payroll_variation_alert_pct}
              onChange={(e) => setForm({ ...form, payroll_variation_alert_pct: Number(e.target.value) })}
            />
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Salvar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
