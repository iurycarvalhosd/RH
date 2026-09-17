import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAppSettings } from "@/lib/calculations/settings";
import { getHourBankSummary } from "@/lib/calculations/hour-bank";
import { getVacationPeriodsWithStatus } from "@/lib/calculations/vacations";
import { getPayrollSummary } from "@/lib/calculations/payroll";
import { listScopedEmployees } from "@/lib/calculations/employees";
import { computeExpiryStatus } from "@/lib/calculations/expiry";
import { getTrainingCompliance } from "@/lib/calculations/training-compliance";

export type AlertSeverity = "atencao" | "critico";

export interface Alert {
  category: string;
  severity: AlertSeverity;
  message: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

export async function getAlerts(branchId: string | null): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const settings = await getAppSettings();
  const admin = createAdminClient();

  const hourBank = await getHourBankSummary(branchId);
  for (const row of hourBank) {
    if (row.status === "acima") {
      alerts.push({
        category: "Banco de horas",
        severity: "critico",
        message: `${row.employee_name} está acima do limite de banco de horas (${row.cumulative_balance_hours.toFixed(1)}h de ${row.limit_hours}h).`,
      });
    } else if (row.status === "atencao") {
      alerts.push({
        category: "Banco de horas",
        severity: "atencao",
        message: `${row.employee_name} está se aproximando do limite de banco de horas (${row.cumulative_balance_hours.toFixed(1)}h de ${row.limit_hours}h).`,
      });
    }
  }

  const vacationPeriods = await getVacationPeriodsWithStatus(branchId);
  for (const p of vacationPeriods) {
    if (p.status === "vencida") {
      alerts.push({
        category: "Férias",
        severity: "critico",
        message: `Período de férias de ${p.employee_name} está vencido desde ${formatDate(p.due_date)}.`,
      });
    } else if (p.status === "atencao") {
      alerts.push({
        category: "Férias",
        severity: "atencao",
        message: `Férias de ${p.employee_name} vencem em ${formatDate(p.due_date)}.`,
      });
    }
  }

  const employees = await listScopedEmployees(branchId, { onlyActive: true });
  if (employees.length > 0) {
    const employeeIds = employees.map((e) => e.id);
    const { data: reviews } = await admin
      .from("performance_reviews")
      .select("employee_id, review_date")
      .in("employee_id", employeeIds)
      .order("review_date", { ascending: false });
    const latestReview = new Map<string, string>();
    for (const r of (reviews ?? []) as Array<{ employee_id: string; review_date: string }>) {
      if (!latestReview.has(r.employee_id)) latestReview.set(r.employee_id, r.review_date);
    }
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().slice(0, 10);
    for (const emp of employees) {
      const last = latestReview.get(emp.id);
      if (!last) {
        alerts.push({ category: "Desempenho", severity: "atencao", message: `${emp.name} nunca recebeu uma avaliação de desempenho.` });
      } else if (last < oneYearAgoStr) {
        alerts.push({
          category: "Desempenho",
          severity: "atencao",
          message: `${emp.name} não é avaliado há mais de 12 meses (última avaliação em ${formatDate(last)}).`,
        });
      }
    }

    const now = new Date();
    const payrollSummary = await getPayrollSummary(branchId, now.getFullYear(), now.getMonth() + 1);
    if (payrollSummary.variation_pct !== null && Math.abs(payrollSummary.variation_pct) >= settings.payroll_variation_alert_pct) {
      alerts.push({
        category: "Folha",
        severity: "atencao",
        message: `Folha do mês variou ${payrollSummary.variation_pct.toFixed(1)}% em relação ao mês anterior (limite configurado: ${settings.payroll_variation_alert_pct}%).`,
      });
    }

    const trainingCompliance = await getTrainingCompliance(branchId);
    for (const t of trainingCompliance) {
      if (t.status === "atrasado") {
        alerts.push({
          category: "Compliance",
          severity: "critico",
          message: `Treinamento "${t.training_program_name}" de ${t.employee_name} está atrasado${t.next_due_date ? ` desde ${formatDate(t.next_due_date)}` : ""}.`,
        });
      } else if (t.status === "nunca_realizado") {
        alerts.push({
          category: "Compliance",
          severity: "atencao",
          message: `${t.employee_name} ainda não realizou o treinamento "${t.training_program_name}".`,
        });
      } else if (t.status === "a_vencer" && t.next_due_date) {
        alerts.push({
          category: "Compliance",
          severity: "atencao",
          message: `Treinamento "${t.training_program_name}" de ${t.employee_name} vence em ${formatDate(t.next_due_date)}.`,
        });
      }
    }

    let documentsQuery = admin
      .from("compliance_documents")
      .select("document_type, expires_at, employee:employees!inner(id, name, branch_id)")
      .in("employee_id", employeeIds);
    if (branchId) documentsQuery = documentsQuery.eq("employee.branch_id", branchId);
    const { data: documents } = await documentsQuery;
    for (const d of (documents ?? []) as unknown as Array<{ document_type: string; expires_at: string; employee: { name: string } }>) {
      const status = computeExpiryStatus(d.expires_at, settings.compliance_alert_days);
      if (status === "vencido") {
        alerts.push({ category: "Compliance", severity: "critico", message: `${d.document_type} de ${d.employee.name} está vencido desde ${formatDate(d.expires_at)}.` });
      } else if (status === "a_vencer") {
        alerts.push({ category: "Compliance", severity: "atencao", message: `${d.document_type} de ${d.employee.name} vence em ${formatDate(d.expires_at)}.` });
      }
    }

    let ppeQuery = admin
      .from("ppe_deliveries")
      .select("item, expiry_date, employee:employees!inner(id, name, branch_id)")
      .in("employee_id", employeeIds)
      .eq("active", true)
      .not("expiry_date", "is", null);
    if (branchId) ppeQuery = ppeQuery.eq("employee.branch_id", branchId);
    const { data: ppeItems } = await ppeQuery;
    for (const p of (ppeItems ?? []) as unknown as Array<{ item: string; expiry_date: string; employee: { name: string } }>) {
      const status = computeExpiryStatus(p.expiry_date, settings.compliance_alert_days);
      if (status === "vencido") {
        alerts.push({ category: "Compliance", severity: "critico", message: `EPI "${p.item}" de ${p.employee.name} está vencido desde ${formatDate(p.expiry_date)}.` });
      } else if (status === "a_vencer") {
        alerts.push({ category: "Compliance", severity: "atencao", message: `EPI "${p.item}" de ${p.employee.name} vence em ${formatDate(p.expiry_date)}.` });
      }
    }

    const { data: pendingAttestations } = await admin
      .from("attestations")
      .select("id, employee:employees!inner(id, name, branch_id)")
      .in("employee_id", employeeIds)
      .eq("status", "pendente");
    for (const a of (pendingAttestations ?? []) as unknown as Array<{ employee: { name: string } }>) {
      alerts.push({ category: "Compliance", severity: "atencao", message: `Atestado de ${a.employee.name} está pendente de análise.` });
    }
  }

  const severityOrder: Record<AlertSeverity, number> = { critico: 0, atencao: 1 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  return alerts;
}
