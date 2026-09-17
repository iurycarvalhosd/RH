"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import type { TrainingProgramWithPositions } from "@/lib/client/shared-types";
import type { JobPosition, TrainingPeriodicity } from "@/lib/types";

const periodicityLabel: Record<TrainingPeriodicity, string> = {
  semanal: "Semanal",
  mensal: "Mensal",
  semestral: "Semestral",
  anual: "Anual",
};

const EMPTY_FORM = {
  name: "",
  periodicity: "anual" as TrainingPeriodicity,
  applies_to_all_positions: true,
  position_ids: [] as string[],
};

export function TrainingCatalog({ onChanged }: { onChanged?: () => void }) {
  const isAdmin = useIsAdmin();
  const [programs, setPrograms] = useState<TrainingProgramWithPositions[] | null>(null);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setPrograms(await apiGet("/api/training-programs"));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar treinamentos.");
    }
  }

  useEffect(() => {
    load();
    apiGet("/api/positions").then(setPositions).catch(() => {});
  }, []);

  function startEdit(p: TrainingProgramWithPositions) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      periodicity: p.periodicity,
      applies_to_all_positions: p.applies_to_all_positions,
      position_ids: p.position_ids,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function togglePosition(id: string) {
    setForm((f) => ({
      ...f,
      position_ids: f.position_ids.includes(id) ? f.position_ids.filter((p) => p !== id) : [...f.position_ids, id],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await apiPut(`/api/training-programs/${editingId}`, form);
      } else {
        await apiPost("/api/training-programs", form);
      }
      cancelEdit();
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao salvar treinamento.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este treinamento do catálogo? As sessões e presenças ligadas a ele também são apagadas.")) return;
    try {
      await apiDelete(`/api/training-programs/${id}`);
      await load();
      onChanged?.();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir treinamento.");
    }
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      <form onSubmit={handleSubmit}>
        <div className="form-row">
          <div className="field">
            <label htmlFor="tp-name">Nome do treinamento</label>
            <input id="tp-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="tp-periodicity">Periodicidade obrigatória</label>
            <select
              id="tp-periodicity"
              value={form.periodicity}
              onChange={(e) => setForm({ ...form, periodicity: e.target.value as TrainingPeriodicity })}
            >
              {Object.entries(periodicityLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label>
            <input
              type="checkbox"
              style={{ width: "auto", display: "inline-block", marginRight: "0.4rem" }}
              checked={form.applies_to_all_positions}
              onChange={(e) => setForm({ ...form, applies_to_all_positions: e.target.checked })}
            />
            Obrigatório para todos os cargos
          </label>
        </div>
        {!form.applies_to_all_positions && (
          <div className="field">
            <label>Cargos obrigados a fazer este treinamento</label>
            {positions.length === 0 ? (
              <p className="muted">Nenhum cargo cadastrado ainda.</p>
            ) : (
              positions.map((p) => (
                <label key={p.id} style={{ display: "block", fontWeight: "normal" }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto", display: "inline-block", marginRight: "0.4rem" }}
                    checked={form.position_ids.includes(p.id)}
                    onChange={() => togglePosition(p.id)}
                  />
                  {p.title}
                </label>
              ))
            )}
          </div>
        )}
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

      {!programs ? (
        <p className="muted">Carregando...</p>
      ) : programs.length === 0 ? (
        <p className="muted">Nenhum treinamento cadastrado.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Treinamento</th>
              <th>Periodicidade</th>
              <th>Cargos obrigados</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{periodicityLabel[p.periodicity]}</td>
                <td>{p.applies_to_all_positions ? "Todos os cargos" : p.position_titles.join(", ") || "-"}</td>
                {isAdmin && (
                  <td>
                    <button onClick={() => startEdit(p)}>Editar</button>{" "}
                    <button className="danger" onClick={() => handleDelete(p.id)}>
                      Excluir
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
