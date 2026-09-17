"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiPut, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import type { ContractType, EmployeeWithRefs, JobPosition, MaritalStatus, Sector } from "@/lib/types";

const MARITAL_STATUS_LABEL: Record<MaritalStatus, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  uniao_estavel: "União estável",
};

function emptyForm(defaultBranchId: string) {
  return {
    branch_id: defaultBranchId,
    position_id: "",
    sector_id: "",
    name: "",
    hire_date: "",
    status: "active" as "active" | "inactive",
    email: "",
    phone: "",
    cpf: "",
    rg: "",
    birth_date: "",
    nationality: "Brasileira",
    marital_status: "" as MaritalStatus | "",
    address: "",
    ctps_number: "",
    ctps_series: "",
    pis_pasep: "",
    base_salary: "",
    work_schedule: "Segunda a sexta-feira, das 08h00 às 17h00, com 1 (uma) hora de intervalo para repouso e alimentação.",
    contract_type: "indeterminado" as ContractType,
    experience_end_date: "",
  };
}

export default function EquipePage() {
  const { activeBranchId, isNetworkScope, branches } = useBranch();
  const isAdmin = useIsAdmin();
  const [employees, setEmployees] = useState<EmployeeWithRefs[] | null>(null);
  const [positions, setPositions] = useState<JobPosition[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm(isNetworkScope ? "" : activeBranchId));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      setEmployees(await apiGet("/api/employees", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar equipe.");
    }
  }

  useEffect(() => {
    setEmployees(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  useEffect(() => {
    apiGet("/api/positions").then(setPositions).catch(() => {});
    apiGet("/api/sectors").then(setSectors).catch(() => {});
  }, []);

  useEffect(() => {
    if (!editingId) setForm(emptyForm(isNetworkScope ? "" : activeBranchId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  function startEdit(emp: EmployeeWithRefs) {
    setEditingId(emp.id);
    setForm({
      branch_id: emp.branch_id,
      position_id: emp.position_id ?? "",
      sector_id: emp.sector_id ?? "",
      name: emp.name,
      hire_date: emp.hire_date,
      status: emp.status,
      email: emp.email ?? "",
      phone: emp.phone ?? "",
      cpf: emp.cpf ?? "",
      rg: emp.rg ?? "",
      birth_date: emp.birth_date ?? "",
      nationality: emp.nationality || "Brasileira",
      marital_status: emp.marital_status ?? "",
      address: emp.address ?? "",
      ctps_number: emp.ctps_number ?? "",
      ctps_series: emp.ctps_series ?? "",
      pis_pasep: emp.pis_pasep ?? "",
      base_salary: emp.base_salary != null ? String(emp.base_salary) : "",
      work_schedule: emp.work_schedule ?? "",
      contract_type: emp.contract_type,
      experience_end_date: emp.experience_end_date ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(isNetworkScope ? "" : activeBranchId));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      ...form,
      position_id: form.position_id || null,
      sector_id: form.sector_id || null,
      email: form.email || null,
      marital_status: form.marital_status || null,
      base_salary: form.base_salary === "" ? null : Number(form.base_salary),
      experience_end_date: form.contract_type === "experiencia" ? form.experience_end_date || null : null,
    };
    try {
      if (editingId) {
        await apiPut(`/api/employees/${editingId}`, payload);
      } else {
        await apiPost("/api/employees", payload);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao salvar colaborador.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este colaborador? Todos os registros ligados a ele também serão removidos.")) return;
    try {
      await apiDelete(`/api/employees/${id}`);
      await load();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir colaborador.");
    }
  }

  return (
    <div>
      <h1>Equipe</h1>
      <ScopeIndicator />
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>{editingId ? "Editar colaborador" : "Novo colaborador"}</h2>
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
              <label htmlFor="branch_id">Filial</label>
              <select
                id="branch_id"
                required
                value={form.branch_id}
                onChange={(e) => setForm({ ...form, branch_id: e.target.value })}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="position_id">Cargo</label>
              <select
                id="position_id"
                value={form.position_id}
                onChange={(e) => setForm({ ...form, position_id: e.target.value })}
              >
                <option value="">Sem cargo definido</option>
                {positions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="sector_id">Setor</label>
              <select
                id="sector_id"
                value={form.sector_id}
                onChange={(e) => setForm({ ...form, sector_id: e.target.value })}
              >
                <option value="">Sem setor definido</option>
                {sectors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="hire_date">Data de admissão</label>
              <input
                id="hire_date"
                type="date"
                required
                value={form.hire_date}
                onChange={(e) => setForm({ ...form, hire_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="phone">Telefone</label>
              <input
                id="phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>

          <h3>Dados pessoais (para o contrato de trabalho)</h3>
          <div className="form-row">
            <div className="field">
              <label htmlFor="cpf">CPF</label>
              <input
                id="cpf"
                placeholder="000.000.000-00"
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="rg">RG</label>
              <input id="rg" value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
            </div>
            <div className="field">
              <label htmlFor="birth_date">Data de nascimento</label>
              <input
                id="birth_date"
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="nationality">Nacionalidade</label>
              <input
                id="nationality"
                value={form.nationality}
                onChange={(e) => setForm({ ...form, nationality: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="marital_status">Estado civil</label>
              <select
                id="marital_status"
                value={form.marital_status}
                onChange={(e) => setForm({ ...form, marital_status: e.target.value as MaritalStatus | "" })}
              >
                <option value="">Não informado</option>
                {(Object.keys(MARITAL_STATUS_LABEL) as MaritalStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {MARITAL_STATUS_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label htmlFor="address">Endereço completo</label>
            <input
              id="address"
              placeholder="Rua, número, bairro, cidade/UF, CEP"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="ctps_number">CTPS - Número</label>
              <input
                id="ctps_number"
                value={form.ctps_number}
                onChange={(e) => setForm({ ...form, ctps_number: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="ctps_series">CTPS - Série</label>
              <input
                id="ctps_series"
                value={form.ctps_series}
                onChange={(e) => setForm({ ...form, ctps_series: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="pis_pasep">PIS/PASEP</label>
              <input
                id="pis_pasep"
                value={form.pis_pasep}
                onChange={(e) => setForm({ ...form, pis_pasep: e.target.value })}
              />
            </div>
          </div>

          <h3>Contrato de trabalho</h3>
          <div className="form-row">
            <div className="field">
              <label htmlFor="contract_type">Tipo de contrato</label>
              <select
                id="contract_type"
                value={form.contract_type}
                onChange={(e) => {
                  const contract_type = e.target.value as ContractType;
                  if (contract_type === "indeterminado") {
                    setForm({ ...form, contract_type, experience_end_date: "" });
                  } else {
                    setForm({ ...form, contract_type });
                  }
                }}
              >
                <option value="indeterminado">Prazo indeterminado (efetivo)</option>
                <option value="experiencia">Contrato de experiência (prazo determinado)</option>
              </select>
            </div>
            {form.contract_type === "experiencia" && (
              <div className="field">
                <label htmlFor="experience_end_date">Término do período de experiência</label>
                <input
                  id="experience_end_date"
                  type="date"
                  required
                  value={form.experience_end_date}
                  onChange={(e) => setForm({ ...form, experience_end_date: e.target.value })}
                />
                <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem" }}>
                  {[45, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => {
                        if (!form.hire_date) return;
                        const d = new Date(form.hire_date + "T00:00:00");
                        d.setDate(d.getDate() + days);
                        setForm({ ...form, experience_end_date: d.toISOString().slice(0, 10) });
                      }}
                    >
                      +{days} dias
                    </button>
                  ))}
                </div>
                <p className="muted" style={{ fontSize: "0.75rem", marginTop: "0.3rem" }}>
                  O contrato de experiência não pode ultrapassar 90 dias no total, somadas eventuais prorrogações
                  (art. 445, parágrafo único, da CLT).
                </p>
              </div>
            )}
            <div className="field">
              <label htmlFor="base_salary">Salário contratual (R$)</label>
              <input
                id="base_salary"
                type="number"
                min={0}
                step="0.01"
                value={form.base_salary}
                onChange={(e) => setForm({ ...form, base_salary: e.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="work_schedule">Jornada de trabalho</label>
            <input
              id="work_schedule"
              value={form.work_schedule}
              onChange={(e) => setForm({ ...form, work_schedule: e.target.value })}
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
        <h2>Colaboradores</h2>
        {!employees ? (
          <p className="muted">Carregando...</p>
        ) : employees.length === 0 ? (
          <p className="muted">Nenhum colaborador cadastrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                {isNetworkScope && <th>Filial</th>}
                <th>Cargo</th>
                <th>Setor</th>
                <th>Admissão</th>
                <th>Status</th>
                <th>Contato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id}>
                  <td>{emp.name}</td>
                  {isNetworkScope && <td>{emp.branch?.name ?? "-"}</td>}
                  <td>{emp.position?.title ?? "-"}</td>
                  <td>{emp.sector?.name ?? "-"}</td>
                  <td>{new Date(emp.hire_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>
                    <span className="badge" data-status={emp.status === "active" ? "ok" : "critico"}>
                      {emp.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td>
                    {emp.email || "-"}
                    {emp.phone ? ` / ${emp.phone}` : ""}
                  </td>
                  <td>
                    {isAdmin && (
                      <>
                        <button onClick={() => startEdit(emp)}>Editar</button>{" "}
                        <button className="danger" onClick={() => handleDelete(emp.id)}>
                          Excluir
                        </button>
                      </>
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
