"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiDelete, ClientApiError } from "@/lib/client/api";
import type { PositionFunction } from "@/lib/types";

export function PositionFunctionsPanel({ positionId }: { positionId: string }) {
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<PositionFunction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await apiGet(`/api/positions/${positionId}/functions`));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar funções.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!description.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await apiPost(`/api/positions/${positionId}/functions`, {
        description: description.trim(),
        sort_order: items?.length ?? 0,
      });
      setDescription("");
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao adicionar função.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    if (!confirm("Remover esta função?")) return;
    try {
      await apiDelete(`/api/position-functions/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao remover função.");
    }
  }

  return (
    <div>
      <h3>Funções do cargo</h3>
      {error && <p className="error-text">{error}</p>}
      {!items ? (
        <p className="muted">Carregando...</p>
      ) : items.length === 0 ? (
        <p className="muted">Nenhuma função cadastrada para este cargo ainda.</p>
      ) : (
        <ul>
          {items.map((f) => (
            <li key={f.id} style={{ marginBottom: "0.3rem" }}>
              {f.description}
              {isAdmin && (
                <>
                  {" "}
                  <button className="danger" onClick={() => handleRemove(f.id)}>
                    Remover
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.4rem", maxWidth: 480 }}>
        <input
          aria-label="Nova função"
          placeholder="Descreva uma função/responsabilidade do cargo"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" disabled={saving}>
          Adicionar
        </button>
      </form>
    </div>
  );
}
