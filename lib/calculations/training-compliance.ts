import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppSettings } from "@/lib/calculations/settings";
import type { TrainingComplianceRow, TrainingComplianceStatus, TrainingPeriodicity } from "@/lib/types";

export function addPeriodicity(date: Date, periodicity: TrainingPeriodicity): Date {
  const next = new Date(date);
  switch (periodicity) {
    case "semanal":
      next.setDate(next.getDate() + 7);
      break;
    case "mensal":
      next.setMonth(next.getMonth() + 1);
      break;
    case "semestral":
      next.setMonth(next.getMonth() + 6);
      break;
    case "anual":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

interface ProgramRow {
  id: string;
  name: string;
  periodicity: TrainingPeriodicity;
  applies_to_all_positions: boolean;
}

interface EmployeeRow {
  id: string;
  name: string;
  position_id: string | null;
  branch: { name: string } | null;
}

interface AttendanceRow {
  employee_id: string;
  session: { session_date: string; training_program_id: string } | { session_date: string; training_program_id: string }[] | null;
}

// Situação de cada colaborador frente a cada treinamento que se aplica a
// ele (por cargo, ou "todos os cargos"), com base na última sessão em que
// ele constou como presente e na periodicidade obrigatória do treinamento.
// Reaproveitado pela tela de treinamentos, pelos alertas do módulo 1 e pelo
// assistente de chat.
export async function getTrainingCompliance(branchId: string | null): Promise<TrainingComplianceRow[]> {
  const admin = createAdminClient();
  const settings = await getAppSettings();

  const { data: programs, error: programsError } = await admin.from("training_programs").select("*");
  if (programsError) throw programsError;
  if (!programs || programs.length === 0) return [];

  const { data: programPositions, error: ppError } = await admin.from("training_program_positions").select("*");
  if (ppError) throw ppError;

  const requiredPositionsByProgram = new Map<string, Set<string>>();
  for (const pp of (programPositions ?? []) as Array<{ training_program_id: string; position_id: string }>) {
    const set = requiredPositionsByProgram.get(pp.training_program_id) ?? new Set<string>();
    set.add(pp.position_id);
    requiredPositionsByProgram.set(pp.training_program_id, set);
  }

  let employeesQuery = admin
    .from("employees")
    .select("id, name, position_id, branch:branches(name)")
    .eq("status", "active");
  if (branchId) employeesQuery = employeesQuery.eq("branch_id", branchId);
  const { data: employeesData, error: employeesError } = await employeesQuery;
  if (employeesError) throw employeesError;
  const employees = (employeesData ?? []) as unknown as EmployeeRow[];
  if (employees.length === 0) return [];

  const employeeIds = employees.map((e) => e.id);
  const { data: attendanceData, error: attendanceError } = await admin
    .from("training_session_attendees")
    .select("employee_id, session:training_sessions(session_date, training_program_id)")
    .in("employee_id", employeeIds)
    .eq("attended", true);
  if (attendanceError) throw attendanceError;

  const lastDateMap = new Map<string, string>();
  for (const a of (attendanceData ?? []) as unknown as AttendanceRow[]) {
    const session = Array.isArray(a.session) ? a.session[0] : a.session;
    if (!session) continue;
    const key = `${a.employee_id}|${session.training_program_id}`;
    const existing = lastDateMap.get(key);
    if (!existing || session.session_date > existing) lastDateMap.set(key, session.session_date);
  }

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const rows: TrainingComplianceRow[] = [];

  for (const emp of employees) {
    for (const program of programs as ProgramRow[]) {
      const requiredPositions = requiredPositionsByProgram.get(program.id);
      const applies =
        program.applies_to_all_positions || (!!emp.position_id && !!requiredPositions?.has(emp.position_id));
      if (!applies) continue;

      const key = `${emp.id}|${program.id}`;
      const lastDate = lastDateMap.get(key) ?? null;
      let nextDue: string | null = null;
      let status: TrainingComplianceStatus;

      if (!lastDate) {
        status = "nunca_realizado";
      } else {
        const nextDueDate = addPeriodicity(new Date(lastDate + "T00:00:00"), program.periodicity);
        nextDue = nextDueDate.toISOString().slice(0, 10);
        if (nextDue < todayStr) status = "atrasado";
        else {
          const diffDays = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          status = diffDays <= settings.compliance_alert_days ? "a_vencer" : "valido";
        }
      }

      rows.push({
        employee_id: emp.id,
        employee_name: emp.name,
        branch_name: emp.branch?.name ?? "-",
        training_program_id: program.id,
        training_program_name: program.name,
        periodicity: program.periodicity,
        last_session_date: lastDate,
        next_due_date: nextDue,
        status,
      });
    }
  }

  const statusOrder: Record<TrainingComplianceStatus, number> = {
    atrasado: 0,
    nunca_realizado: 1,
    a_vencer: 2,
    valido: 3,
  };
  rows.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);
  return rows;
}
