"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useProfile } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import type { Profile } from "@/lib/types";

interface UserRow extends Profile {
  email: string | null;
}

export function UsuariosClient() {
  const me = useProfile();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "rh_padrao" as "admin" | "rh_padrao" });
  const [saving, setSaving] = useState(false);
  const [passwordEdits, setPasswordEdits] = useState<Record<string, string>>({});

  async function load() {
    try {
      setUsers(await apiGet("/api/users"));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar usuários.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/users", form);
      setForm({ name: "", email: "", password: "", role: "rh_padrao" });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao criar usuário.");
    } finally {
      setSaving(false);
    }
  }

  async function changeRole(id: string, role: "admin" | "rh_padrao") {
    try {
      await apiPut(`/api/users/${id}`, { role });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao alterar papel.");
    }
  }

  async function changePassword(id: string) {
    const password = passwordEdits[id];
    if (!password || password.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    try {
      await apiPut(`/api/users/${id}`, { password });
      setPasswordEdits({ ...passwordEdits, [id]: "" });
      alert("Senha atualizada.");
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao alterar senha.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta conta de RH? A pessoa perde acesso imediatamente.")) return;
    try {
      await apiDelete(`/api/users/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir usuário.");
    }
  }

  return (
    <div>
      <h1>Usuários</h1>
      <p className="muted">Contas com acesso ao sistema de RH.</p>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Novo usuário</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="u-name">Nome</label>
              <input id="u-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="u-email">Email</label>
              <input
                id="u-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="u-password">Senha inicial</label>
              <input
                id="u-password"
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="u-role">Papel</label>
              <select id="u-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "rh_padrao" })}>
                <option value="rh_padrao">RH padrão</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Criar usuário
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Contas cadastradas</h2>
        {!users ? (
          <p className="muted">Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Papel</th>
                <th>Nova senha</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name} {u.id === me.id && <span className="muted">(você)</span>}
                  </td>
                  <td>{u.email ?? "-"}</td>
                  <td>
                    <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value as "admin" | "rh_padrao")}>
                      <option value="rh_padrao">RH padrão</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      <input
                        type="password"
                        placeholder="Nova senha"
                        value={passwordEdits[u.id] ?? ""}
                        onChange={(e) => setPasswordEdits({ ...passwordEdits, [u.id]: e.target.value })}
                      />
                      <button type="button" onClick={() => changePassword(u.id)}>
                        Salvar
                      </button>
                    </div>
                  </td>
                  <td>
                    {u.id !== me.id && (
                      <button className="danger" onClick={() => handleDelete(u.id)}>
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
