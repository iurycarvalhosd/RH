"use client";

import { Fragment, useEffect, useState, type FormEvent } from "react";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import type { FunctionCategory, JobPosition } from "@/lib/types";
import { SalaryBandTable } from "./salary-band-table";
import { PositionFunctionsPanel } from "./position-functions-panel";

const functionCategoryLabel: Record<FunctionCategory, string> = {
  administrativo: "Administrativo",
  comercial: "Comercial",
  producao: "Produção",
  servicos_gerais: "Serviços gerais",
};

const EMPTY_FORM = { title: "", salary_min: "", salary_mid: "", salary_max: "", function_category: "" };

export default function CargosPage() {
  const isAdmin = useIsAdmin();
  const [positions, setPositions] = useState<JobPosition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    try {
      setPositions(await apiGet("/api/positions"));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar cargos.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(p: JobPosition) {
    setEditingId(p.id);
    setForm({
      title: p.title,
      salary_min: String(p.salary_min),
      salary_mid: String(p.salary_mid),
      salary_max: String(p.salary_max),
      function_category: p.function_category ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title,
      salary_min: Number(form.salary_min),
      salary_mid: Number(form.salary_mid),
      salary_max: Number(form.salary_max),
      function_category: form.function_category || null,
    };
    try {
      if (editingId) {
        await apiPut(`/api/positions/${editingId}`, payload);
      } else {
        await apiPost("/api/positions", payload);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao salvar cargo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este cargo?")) return;
    try {
      await apiDelete(`/api/positions/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir cargo.");
    }
  }

  return (
    <div>
      <h1>Cargos e faixas salariais</h1>
      <p className="muted">Cargos e faixas valem para a rede toda. O enquadramento por colaborador abaixo respeita o filtro de filial/rede.</p>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>{editingId ? "Editar cargo" : "Novo cargo"}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="title">Título</label>
              <input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="salary_min">Faixa mínima (R$)</label>
              <input
                id="salary_min"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.salary_min}
                onChange={(e) => setForm({ ...form, salary_min: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="salary_mid">Faixa média (R$)</label>
              <input
                id="salary_mid"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.salary_mid}
                onChange={(e) => setForm({ ...form, salary_mid: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="salary_max">Faixa máxima (R$)</label>
              <input
                id="salary_max"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.salary_max}
                onChange={(e) => setForm({ ...form, salary_max: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="function_category">Categoria de função</label>
              <select
                id="function_category"
                value={form.function_category}
                onChange={(e) => setForm({ ...form, function_category: e.target.value })}
              >
                <option value="">Sem categoria (avaliação livre)</option>
                {Object.entries(functionCategoryLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="muted" style={{ fontSize: "0.8rem" }}>
            A categoria de função define qual modelo padronizado de avaliação de desempenho é sugerido para quem tem
            esse cargo.
          </p>
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
        <h2>Cargos cadastrados</h2>
        {!positions ? (
          <p className="muted">Carregando...</p>
        ) : positions.length === 0 ? (
          <p className="muted">Nenhum cargo cadastrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Mínimo</th>
                <th>Médio</th>
                <th>Máximo</th>
                <th>Categoria de função</th>
                <th></th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => (
                <Fragment key={p.id}>
                  <tr>
                    <td>{p.title}</td>
                    <td>R$ {p.salary_min.toLocaleString("pt-BR")}</td>
                    <td>R$ {p.salary_mid.toLocaleString("pt-BR")}</td>
                    <td>R$ {p.salary_max.toLocaleString("pt-BR")}</td>
                    <td>{p.function_category ? functionCategoryLabel[p.function_category] : "-"}</td>
                    <td>
                      <button onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
                        {expandedId === p.id ? "Ocultar funções" : "Funções"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td>
                        <button onClick={() => startEdit(p)}>Editar</button>{" "}
                        <button className="danger" onClick={() => handleDelete(p.id)}>
                          Excluir
                        </button>
                      </td>
                    )}
                  </tr>
                  {expandedId === p.id && (
                    <tr>
                      <td colSpan={isAdmin ? 7 : 6}>
                        <PositionFunctionsPanel positionId={p.id} />
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
        <h2>Enquadramento salarial da equipe</h2>
        <ScopeIndicator />
        <SalaryBandTable />
      </section>
    </div>
  );
}
