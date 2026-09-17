"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import type { EmployeeRefLite, PpeDeliveryWithEmployee } from "@/lib/client/shared-types";

type PpeRow = PpeDeliveryWithEmployee & { status: "valido" | "a_vencer" | "vencido" | null };

const statusLabel: Record<string, string> = { valido: "Válido", a_vencer: "A vencer", vencido: "Vencido" };
const statusBadge: Record<string, string> = { valido: "ok", a_vencer: "atencao", vencido: "critico" };
const closedReasonLabel: Record<string, string> = { substituido: "Substituído", dispensado: "Dispensado" };

export default function EpiPage() {
  const { activeBranchId } = useBranch();
  const isAdmin = useIsAdmin();
  const [items, setItems] = useState<PpeRow[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeRefLite[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    employee_id: "",
    item: "",
    ca_number: "",
    delivery_date: "",
    expiry_date: "",
    confirmed: false,
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setItems(await apiGet("/api/compliance/ppe", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar entregas de EPI.");
    }
  }

  useEffect(() => {
    setItems(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  useEffect(() => {
    apiGet("/api/employees", { branchId: activeBranchId }).then(setEmployees).catch(() => {});
  }, [activeBranchId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiPost("/api/compliance/ppe", { ...form, expiry_date: form.expiry_date || null });
      setForm({ employee_id: "", item: "", ca_number: "", delivery_date: "", expiry_date: "", confirmed: false });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao registrar entrega.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleConfirmed(id: string, confirmed: boolean) {
    try {
      await apiPut(`/api/compliance/ppe/${id}`, { confirmed });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao atualizar confirmação.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta entrega de EPI?")) return;
    try {
      await apiDelete(`/api/compliance/ppe/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir.");
    }
  }

  async function closeDelivery(id: string, reason: "substituido" | "dispensado") {
    const message =
      reason === "substituido"
        ? "Marcar como substituído? Deixa de contar para alertas de vencimento. Lembre de registrar a nova entrega separadamente."
        : "Dispensar este EPI? Deixa de contar para alertas de vencimento.";
    if (!confirm(message)) return;
    try {
      await apiPut(`/api/compliance/ppe/${id}`, { active: false, closed_reason: reason });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao encerrar entrega.");
    }
  }

  async function reactivateDelivery(id: string) {
    try {
      await apiPut(`/api/compliance/ppe/${id}`, { active: true });
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao reativar entrega.");
    }
  }

  return (
    <div>
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Nova entrega de EPI</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="epi-employee">Colaborador</label>
              <select
                id="epi-employee"
                required
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="epi-item">Item</label>
              <input id="epi-item" required value={form.item} onChange={(e) => setForm({ ...form, item: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="epi-ca">Número do CA</label>
              <input
                id="epi-ca"
                required
                placeholder="Certificado de Aprovação"
                value={form.ca_number}
                onChange={(e) => setForm({ ...form, ca_number: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="epi-delivery">Data de entrega</label>
              <input
                id="epi-delivery"
                type="date"
                required
                value={form.delivery_date}
                onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="epi-expiry">Validade</label>
              <input
                id="epi-expiry"
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label>
              <input
                type="checkbox"
                style={{ width: "auto", display: "inline-block", marginRight: "0.4rem" }}
                checked={form.confirmed}
                onChange={(e) => setForm({ ...form, confirmed: e.target.checked })}
              />
              Recebimento confirmado (assinatura)
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={saving}>
              Registrar
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Entregas de EPI</h2>
        {!items ? (
          <p className="muted">Carregando...</p>
        ) : items.length === 0 ? (
          <p className="muted">Nenhuma entrega registrada.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Item</th>
                <th>CA</th>
                <th>Entrega</th>
                <th>Validade</th>
                <th>Status</th>
                <th>Confirmado</th>
                <th></th>
                {isAdmin && <th>Encerrar</th>}
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} style={it.active ? undefined : { opacity: 0.6 }}>
                  <td>{it.employee?.name ?? "-"}</td>
                  <td>{it.item}</td>
                  <td>{it.ca_number || "-"}</td>
                  <td>{new Date(it.delivery_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{it.expiry_date ? new Date(it.expiry_date + "T00:00:00").toLocaleDateString("pt-BR") : "-"}</td>
                  <td>
                    {!it.active && it.closed_reason ? (
                      <span className="badge">{closedReasonLabel[it.closed_reason]}</span>
                    ) : it.status ? (
                      <span className="badge" data-status={statusBadge[it.status]}>
                        {statusLabel[it.status]}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    {isAdmin ? (
                      <input
                        type="checkbox"
                        style={{ width: "auto" }}
                        checked={it.confirmed}
                        onChange={(e) => toggleConfirmed(it.id, e.target.checked)}
                      />
                    ) : it.confirmed ? (
                      "Sim"
                    ) : (
                      "Não"
                    )}
                  </td>
                  <td>
                    <a href={`/api/compliance/ppe/${it.id}/receipt`} target="_blank" rel="noopener noreferrer">
                      Recibo (PDF)
                    </a>
                  </td>
                  {isAdmin && (
                    <td>
                      {it.active ? (
                        <>
                          <button onClick={() => closeDelivery(it.id, "substituido")}>Substituído</button>{" "}
                          <button onClick={() => closeDelivery(it.id, "dispensado")}>Dispensado</button>
                        </>
                      ) : (
                        <button onClick={() => reactivateDelivery(it.id)}>Reativar</button>
                      )}
                    </td>
                  )}
                  {isAdmin && (
                    <td>
                      <button className="danger" onClick={() => handleDelete(it.id)}>
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
