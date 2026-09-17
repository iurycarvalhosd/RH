"use client";

import { useState, type FormEvent } from "react";
import { useIsAdmin } from "@/lib/profile-context";
import { apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import type { PerformanceReviewTemplateWithCriteria } from "@/lib/client/shared-types";
import type { FunctionCategory } from "@/lib/types";

const functionCategoryLabel: Record<FunctionCategory, string> = {
  administrativo: "Administrativo",
  comercial: "Comercial",
  producao: "Produção",
  servicos_gerais: "Serviços gerais",
};

interface CriterionForm {
  label: string;
  description: string;
}

export function PerformanceTemplatesManager({
  templates,
  onChanged,
}: {
  templates: PerformanceReviewTemplateWithCriteria[];
  onChanged: () => void;
}) {
  const isAdmin = useIsAdmin();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editState, setEditState] = useState<{ name: string; function_category: FunctionCategory; criteria: CriterionForm[] } | null>(
    null
  );
  const [creating, setCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState<{ name: string; function_category: FunctionCategory; criteria: CriterionForm[] }>({
    name: "",
    function_category: "administrativo",
    criteria: [{ label: "", description: "" }],
  });

  function startEdit(t: PerformanceReviewTemplateWithCriteria) {
    setExpandedId(t.id);
    setEditState({
      name: t.name,
      function_category: t.function_category,
      criteria: t.criteria.map((c) => ({ label: c.label, description: c.description ?? "" })),
    });
  }

  async function saveEdit(id: string) {
    if (!editState) return;
    setError(null);
    try {
      await apiPut(`/api/performance-templates/${id}`, {
        name: editState.name,
        function_category: editState.function_category,
        criteria: editState.criteria
          .filter((c) => c.label.trim())
          .map((c, idx) => ({ label: c.label, description: c.description || null, sort_order: idx })),
      });
      setEditState(null);
      setExpandedId(null);
      onChanged();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao salvar modelo.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este modelo de avaliação?")) return;
    try {
      await apiDelete(`/api/performance-templates/${id}`);
      onChanged();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir modelo.");
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      await apiPost("/api/performance-templates", {
        name: newTemplate.name,
        function_category: newTemplate.function_category,
        criteria: newTemplate.criteria
          .filter((c) => c.label.trim())
          .map((c, idx) => ({ label: c.label, description: c.description || null, sort_order: idx })),
      });
      setNewTemplate({ name: "", function_category: "administrativo", criteria: [{ label: "", description: "" }] });
      setCreating(false);
      onChanged();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao criar modelo.");
    }
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}
      <table>
        <thead>
          <tr>
            <th>Modelo</th>
            <th>Categoria de função</th>
            <th>Critérios</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {templates.map((t) => (
            <tr key={t.id}>
              <td>{t.name}</td>
              <td>{functionCategoryLabel[t.function_category]}</td>
              <td>{t.criteria.length}</td>
              <td>
                {isAdmin && (
                  <button onClick={() => (expandedId === t.id ? setExpandedId(null) : startEdit(t))}>
                    {expandedId === t.id ? "Fechar" : "Editar"}
                  </button>
                )}{" "}
                {isAdmin && (
                  <button className="danger" onClick={() => handleDelete(t.id)}>
                    Excluir
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {expandedId && editState && (
        <div className="field">
          <h3>Editar modelo</h3>
          <div className="form-row">
            <div className="field">
              <label>Nome</label>
              <input value={editState.name} onChange={(e) => setEditState({ ...editState, name: e.target.value })} />
            </div>
            <div className="field">
              <label>Categoria de função</label>
              <select
                value={editState.function_category}
                onChange={(e) => setEditState({ ...editState, function_category: e.target.value as FunctionCategory })}
              >
                {Object.entries(functionCategoryLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {editState.criteria.map((c, idx) => (
            <div className="form-row" key={idx}>
              <div className="field">
                <input
                  placeholder="Critério"
                  value={c.label}
                  onChange={(e) => {
                    const next = [...editState.criteria];
                    next[idx] = { ...next[idx], label: e.target.value };
                    setEditState({ ...editState, criteria: next });
                  }}
                />
              </div>
              <div className="field">
                <input
                  placeholder="Descrição (opcional)"
                  value={c.description}
                  onChange={(e) => {
                    const next = [...editState.criteria];
                    next[idx] = { ...next[idx], description: e.target.value };
                    setEditState({ ...editState, criteria: next });
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => setEditState({ ...editState, criteria: editState.criteria.filter((_, i) => i !== idx) })}
              >
                Remover
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setEditState({ ...editState, criteria: [...editState.criteria, { label: "", description: "" }] })}
          >
            + adicionar critério
          </button>
          <div className="form-actions">
            <button onClick={() => saveEdit(expandedId)}>Salvar modelo</button>
            <button
              type="button"
              onClick={() => {
                setExpandedId(null);
                setEditState(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {isAdmin && (
        <div className="field">
          {!creating ? (
            <button type="button" onClick={() => setCreating(true)}>
              + novo modelo de avaliação
            </button>
          ) : (
            <form onSubmit={handleCreate}>
              <h3>Novo modelo</h3>
              <div className="form-row">
                <div className="field">
                  <label>Nome</label>
                  <input required value={newTemplate.name} onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })} />
                </div>
                <div className="field">
                  <label>Categoria de função</label>
                  <select
                    value={newTemplate.function_category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, function_category: e.target.value as FunctionCategory })}
                  >
                    {Object.entries(functionCategoryLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {newTemplate.criteria.map((c, idx) => (
                <div className="form-row" key={idx}>
                  <div className="field">
                    <input
                      placeholder="Critério"
                      value={c.label}
                      onChange={(e) => {
                        const next = [...newTemplate.criteria];
                        next[idx] = { ...next[idx], label: e.target.value };
                        setNewTemplate({ ...newTemplate, criteria: next });
                      }}
                    />
                  </div>
                  <div className="field">
                    <input
                      placeholder="Descrição (opcional)"
                      value={c.description}
                      onChange={(e) => {
                        const next = [...newTemplate.criteria];
                        next[idx] = { ...next[idx], description: e.target.value };
                        setNewTemplate({ ...newTemplate, criteria: next });
                      }}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNewTemplate({ ...newTemplate, criteria: [...newTemplate.criteria, { label: "", description: "" }] })}
              >
                + adicionar critério
              </button>
              <div className="form-actions">
                <button type="submit">Criar modelo</button>
                <button type="button" onClick={() => setCreating(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
