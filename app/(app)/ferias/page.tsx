"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useBranch } from "@/lib/branch-context";
import { useIsAdmin } from "@/lib/profile-context";
import { apiGet, apiPost, apiDelete, ClientApiError } from "@/lib/client/api";
import { ScopeIndicator } from "@/components/scope-indicator";
import type { EmployeeRefLite, VacationBookingWithEmployee, VacationPeriodWithEmployee } from "@/lib/client/shared-types";

type PeriodRow = VacationPeriodWithEmployee & { status: "em_dia" | "atencao" | "vencida" };

const statusLabel: Record<string, string> = { em_dia: "Em dia", atencao: "Atenção", vencida: "Vencida" };

export default function FeriasPage() {
  const { activeBranchId, isNetworkScope } = useBranch();
  const isAdmin = useIsAdmin();
  const [periods, setPeriods] = useState<PeriodRow[] | null>(null);
  const [bookings, setBookings] = useState<VacationBookingWithEmployee[] | null>(null);
  const [employees, setEmployees] = useState<EmployeeRefLite[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [periodForm, setPeriodForm] = useState({
    employee_id: "",
    period_start: "",
    period_end: "",
    due_date: "",
    days_available: "30",
  });
  const [bookingForm, setBookingForm] = useState({ vacation_period_id: "", start_date: "", end_date: "", days: "" });
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);

  async function loadPeriods() {
    try {
      setPeriods(await apiGet("/api/vacations/periods", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar férias.");
    }
  }

  async function loadBookings() {
    try {
      setBookings(await apiGet("/api/vacations/bookings", { branchId: activeBranchId }));
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao carregar agendamentos.");
    }
  }

  useEffect(() => {
    setPeriods(null);
    setBookings(null);
    loadPeriods();
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);

  useEffect(() => {
    apiGet("/api/employees", { branchId: activeBranchId }).then(setEmployees).catch(() => {});
  }, [activeBranchId]);

  async function handlePeriodSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingPeriod(true);
    setError(null);
    try {
      await apiPost("/api/vacations/periods", {
        ...periodForm,
        days_available: Number(periodForm.days_available),
      });
      setPeriodForm({ employee_id: "", period_start: "", period_end: "", due_date: "", days_available: "30" });
      await loadPeriods();
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao cadastrar período aquisitivo.");
    } finally {
      setSavingPeriod(false);
    }
  }

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingBooking(true);
    setError(null);
    const period = periods?.find((p) => p.id === bookingForm.vacation_period_id);
    try {
      await apiPost("/api/vacations/bookings", {
        vacation_period_id: bookingForm.vacation_period_id,
        employee_id: period?.employee_id,
        start_date: bookingForm.start_date,
        end_date: bookingForm.end_date,
        days: Number(bookingForm.days),
      });
      setBookingForm({ vacation_period_id: "", start_date: "", end_date: "", days: "" });
      await Promise.all([loadPeriods(), loadBookings()]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao agendar férias.");
    } finally {
      setSavingBooking(false);
    }
  }

  async function handleDeleteBooking(id: string) {
    if (!confirm("Excluir este agendamento? Os dias voltam para o saldo do período.")) return;
    try {
      await apiDelete(`/api/vacations/bookings/${id}`);
      await Promise.all([loadPeriods(), loadBookings()]);
    } catch (e) {
      setError(e instanceof ClientApiError ? e.message : "Erro ao excluir agendamento.");
    }
  }

  return (
    <div>
      <h1>Férias</h1>
      <ScopeIndicator />
      {error && <p className="error-text">{error}</p>}

      <section className="section">
        <h2>Períodos aquisitivos</h2>
        {!periods ? (
          <p className="muted">Carregando...</p>
        ) : periods.length === 0 ? (
          <p className="muted">Nenhum período aquisitivo cadastrado.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                {isNetworkScope && <th>Filial</th>}
                <th>Período aquisitivo</th>
                <th>Vencimento</th>
                <th>Disponíveis</th>
                <th>Já marcados</th>
                <th>Saldo</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td>{p.employee?.name ?? "-"}</td>
                  {isNetworkScope && <td>-</td>}
                  <td>
                    {new Date(p.period_start + "T00:00:00").toLocaleDateString("pt-BR")} a{" "}
                    {new Date(p.period_end + "T00:00:00").toLocaleDateString("pt-BR")}
                  </td>
                  <td>{new Date(p.due_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{p.days_available}</td>
                  <td>{p.days_taken}</td>
                  <td>{Number(p.days_available) - Number(p.days_taken)}</td>
                  <td>
                    <span
                      className="badge"
                      data-status={p.status === "em_dia" ? "ok" : p.status === "atencao" ? "atencao" : "critico"}
                    >
                      {statusLabel[p.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="section">
        <h2>Novo período aquisitivo</h2>
        <form onSubmit={handlePeriodSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="pf-employee">Colaborador</label>
              <select
                id="pf-employee"
                required
                value={periodForm.employee_id}
                onChange={(e) => setPeriodForm({ ...periodForm, employee_id: e.target.value })}
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
              <label htmlFor="pf-start">Início do período</label>
              <input
                id="pf-start"
                type="date"
                required
                value={periodForm.period_start}
                onChange={(e) => setPeriodForm({ ...periodForm, period_start: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-end">Fim do período</label>
              <input
                id="pf-end"
                type="date"
                required
                value={periodForm.period_end}
                onChange={(e) => setPeriodForm({ ...periodForm, period_end: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-due">Vencimento</label>
              <input
                id="pf-due"
                type="date"
                required
                value={periodForm.due_date}
                onChange={(e) => setPeriodForm({ ...periodForm, due_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="pf-days">Dias disponíveis</label>
              <input
                id="pf-days"
                type="number"
                min={0}
                value={periodForm.days_available}
                onChange={(e) => setPeriodForm({ ...periodForm, days_available: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={savingPeriod}>
              Cadastrar
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Agendar férias</h2>
        <form onSubmit={handleBookingSubmit}>
          <div className="form-row">
            <div className="field">
              <label htmlFor="bf-period">Período aquisitivo</label>
              <select
                id="bf-period"
                required
                value={bookingForm.vacation_period_id}
                onChange={(e) => setBookingForm({ ...bookingForm, vacation_period_id: e.target.value })}
              >
                <option value="" disabled>
                  Selecione...
                </option>
                {periods?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.employee?.name} (saldo: {Number(p.days_available) - Number(p.days_taken)} dias)
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="bf-start">Início</label>
              <input
                id="bf-start"
                type="date"
                required
                value={bookingForm.start_date}
                onChange={(e) => setBookingForm({ ...bookingForm, start_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="bf-end">Fim</label>
              <input
                id="bf-end"
                type="date"
                required
                value={bookingForm.end_date}
                onChange={(e) => setBookingForm({ ...bookingForm, end_date: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="bf-days">Dias</label>
              <input
                id="bf-days"
                type="number"
                min={1}
                required
                value={bookingForm.days}
                onChange={(e) => setBookingForm({ ...bookingForm, days: e.target.value })}
              />
            </div>
          </div>
          <div className="form-actions">
            <button type="submit" disabled={savingBooking}>
              Agendar
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <h2>Agendamentos</h2>
        {!bookings ? (
          <p className="muted">Carregando...</p>
        ) : bookings.length === 0 ? (
          <p className="muted">Nenhum agendamento.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Dias</th>
                {isAdmin && <th></th>}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.employee?.name ?? "-"}</td>
                  <td>{new Date(b.start_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{new Date(b.end_date + "T00:00:00").toLocaleDateString("pt-BR")}</td>
                  <td>{b.days}</td>
                  {isAdmin && (
                    <td>
                      <button className="danger" onClick={() => handleDeleteBooking(b.id)}>
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
