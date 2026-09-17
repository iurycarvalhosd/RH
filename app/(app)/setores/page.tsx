"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import type { Sector } from "@/lib/types";

const EMPTY_FORM = { name: "", description: "" };

export default function SetoresPage() {
  const isAdmin = useIsAdmin();
  const [sectors, setSectors] = useState<Sector[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setSectors(await apiGet("/api/sectors"));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar setores.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(s: Sector) {
    setEditingId(s.id);
    setForm({ name: s.name, description: s.description ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = { ...form, description: form.description || null };
    try {
      if (editingId) {
        await apiPut(`/api/sectors/${editingId}`, payload);
      } else {
        await apiPost("/api/sectors", payload);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao salvar setor.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este setor? Colaboradores vinculados a ele precisam ser reatribuídos antes.")) return;
    try {
      await apiDelete(`/api/sectors/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir setor.");
    }
  }

  return (
    <div>
      <h1>Setores</h1>
      <p className="muted">
        Cadastre os setores/departamentos da empresa para vincular colaboradores e analisar métricas também por
        setor, além da filial e da rede como um todo.
      </p>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>{editingId ? "Editar setor" : "Novo setor"}</h2>
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
              <label htmlFor="description">Descrição</label>
              <input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
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
        <h2>Setores cadastrados</h2>
        {!sectors ? (
          <p className="muted">Carregando...</p>
        ) : sectors.length === 0 ? (
          <p className="muted">Nenhum setor cadastrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrição</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {sectors.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.description || "-"}</td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => startEdit(s)}>Editar</button>{" "}
                      <button className="danger" onClick={() => handleDelete(s.id)}>
                        Excluir
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
