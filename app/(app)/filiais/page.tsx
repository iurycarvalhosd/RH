"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import type { Branch } from "@/lib/types";

const EMPTY_FORM = { name: "", address: "", manager_name: "", cnpj: "" };

export default function FiliaisPage() {
  const router = useRouter();
  const isAdmin = useIsAdmin();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setBranches(await apiGet("/api/branches"));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar filiais.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setForm({ name: b.name, address: b.address ?? "", manager_name: b.manager_name ?? "", cnpj: b.cnpj ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await apiPut(`/api/branches/${editingId}`, form);
      } else {
        await apiPost("/api/branches", form);
      }
      cancelEdit();
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao salvar filial.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta filial?")) return;
    try {
      await apiDelete(`/api/branches/${id}`);
      await load();
      router.refresh();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir filial.");
    }
  }

  return (
    <div>
      <h1>Filiais</h1>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>{editingId ? "Editar filial" : "Nova filial"}</h2>
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
              <label htmlFor="manager_name">Responsável</label>
              <input
                id="manager_name"
                value={form.manager_name}
                onChange={(e) => setForm({ ...form, manager_name: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="cnpj">CNPJ</label>
              <input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="address">Endereço</label>
            <input
              id="address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
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
        <h2>Filiais cadastradas</h2>
        {!branches ? (
          <p className="muted">Carregando...</p>
        ) : branches.length === 0 ? (
          <p className="muted">Nenhuma filial cadastrada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Endereço</th>
                <th>Responsável</th>
                <th>CNPJ</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.address || "-"}</td>
                  <td>{b.manager_name || "-"}</td>
                  <td>{b.cnpj || "-"}</td>
                  {isAdmin && (
                    <td>
                      <button onClick={() => startEdit(b)}>Editar</button>{" "}
                      <button className="danger" onClick={() => handleDelete(b.id)}>
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
