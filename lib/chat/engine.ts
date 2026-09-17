import "server-only";
import { getHourBankSummary } from "@/lib/calculations/hour-bank";
import { getVacationPeriodsWithStatus } from "@/lib/calculations/vacations";
import { getPayrollSummary } from "@/lib/calculations/payroll";
import { getAverageLatestScore } from "@/lib/calculations/performance";
import { listScopedEmployees } from "@/lib/calculations/employees";
import { getTurnoverSeries } from "@/lib/calculations/turnover";
import { getAbsenteeismSeries } from "@/lib/calculations/absenteeism";
import { getEnpsHistory } from "@/lib/calculations/enps";
import { getAlerts } from "@/lib/calculations/alerts";
import { getTrainingCompliance } from "@/lib/calculations/training-compliance";
import { getAppSettings } from "@/lib/calculations/settings";
import { computeExpiryStatus, daysUntil } from "@/lib/calculations/expiry";
import { createAdminClient } from "@/lib/supabase/admin";

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function formatDate(dateStr: string) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("pt-BR");
}

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Extrai uma janela de dias de expressões como "essa semana", "esse mes",
// "nos proximos 15 dias". Padrão: 30 dias.
function extractWindowDays(msg: string): number {
  const explicit = msg.match(/proxim\w*\s+(\d+)\s+dias?/);
  if (explicit) return Number(explicit[1]);
  if (/essa semana|nesta semana|na semana/.test(msg)) return 7;
  if (/hoje/.test(msg)) return 1;
  if (/esse mes|neste mes|no mes/.test(msg)) return 30;
  return 30;
}

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

interface Intent {
  test: (msg: string) => boolean;
  handle: (branchId: string | null, msg: string) => Promise<string>;
}

const intents: Intent[] = [
  {
    test: (m) => /banco de horas|saldo de horas/.test(m),
    handle: async (branchId, msg) => {
      const rows = await getHourBankSummary(branchId);
      if (rows.length === 0) return "Não há colaboradores ativos nesse escopo para calcular banco de horas.";
      const wantsLowest = /menos|menor/.test(msg);
      const sorted = wantsLowest ? [...rows].reverse() : rows;
      const top = sorted.slice(0, 5);
      const lines = top.map(
        (r) => `- ${r.employee_name} (${r.branch_name}): ${r.cumulative_balance_hours.toFixed(1)}h acumuladas, status ${r.status}`
      );
      return `Banco de horas ${wantsLowest ? "(do menor para o maior)" : "(do maior para o menor)"}:\n${lines.join("\n")}`;
    },
  },
  {
    test: (m) => /hora(s)? extra/.test(m),
    handle: async (branchId) => {
      const rows = await getHourBankSummary(branchId);
      const sorted = [...rows].sort((a, b) => b.period_overtime_hours - a.period_overtime_hours);
      if (sorted.length === 0) return "Não há colaboradores ativos nesse escopo.";
      const lines = sorted.slice(0, 5).map((r) => `- ${r.employee_name}: ${r.period_overtime_hours.toFixed(1)}h no período`);
      return `Horas extras no período atual:\n${lines.join("\n")}`;
    },
  },
  {
    test: (m) => /ferias/.test(m),
    handle: async (branchId, msg) => {
      const periods = await getVacationPeriodsWithStatus(branchId);
      if (/vencid/.test(msg)) {
        const expired = periods.filter((p) => p.status === "vencida");
        if (expired.length === 0) return "Nenhum período de férias vencido nesse escopo.";
        return `Períodos de férias vencidos:\n${expired.map((p) => `- ${p.employee_name}: venceu em ${formatDate(p.due_date)}`).join("\n")}`;
      }
      const windowDays = extractWindowDays(msg);
      const upcoming = periods.filter((p) => {
        const diff = daysUntil(p.due_date);
        return diff >= 0 && diff <= windowDays;
      });
      if (upcoming.length === 0) return `Nenhuma férias vencendo nos próximos ${windowDays} dias nesse escopo.`;
      return `Férias vencendo nos próximos ${windowDays} dias:\n${upcoming
        .map((p) => `- ${p.employee_name}: vence em ${formatDate(p.due_date)}`)
        .join("\n")}`;
    },
  },
  {
    test: (m) => /avalia(cao|ção)? pendente|nao (foi|foram) avaliad|sem avaliacao/.test(m),
    handle: async (branchId) => {
      const alerts = await getAlerts(branchId);
      const performanceAlerts = alerts.filter((a) => a.category === "Desempenho");
      if (performanceAlerts.length === 0) return "Todo mundo está com avaliação de desempenho em dia nesse escopo.";
      return performanceAlerts.map((a) => `- ${a.message}`).join("\n");
    },
  },
  {
    test: (m) => /desempenho|nota (media|mais alta|mais baixa)|avalia(cao|ção)/.test(m),
    handle: async (branchId, msg) => {
      if (/media/.test(msg)) {
        const { average, count } = await getAverageLatestScore(branchId);
        if (average === null) return "Ainda não há avaliações registradas nesse escopo.";
        return `Nota média de desempenho: ${average.toFixed(1)} (com base em ${count} colaboradores avaliados).`;
      }
      const admin = createAdminClient();
      const employees = await listScopedEmployees(branchId, { onlyActive: true });
      const { data: reviews } = await admin
        .from("performance_reviews")
        .select("employee_id, score, review_date")
        .in(
          "employee_id",
          employees.map((e) => e.id)
        )
        .order("review_date", { ascending: false });
      const latest = new Map<string, number>();
      for (const r of (reviews ?? []) as Array<{ employee_id: string; score: number }>) {
        if (!latest.has(r.employee_id)) latest.set(r.employee_id, Number(r.score));
      }
      if (latest.size === 0) return "Ainda não há avaliações registradas nesse escopo.";
      const wantsLowest = /baixa|menor|pior/.test(msg);
      const rows = employees
        .filter((e) => latest.has(e.id))
        .map((e) => ({ name: e.name, score: latest.get(e.id)! }))
        .sort((a, b) => (wantsLowest ? a.score - b.score : b.score - a.score));
      return `Desempenho (${wantsLowest ? "menor nota primeiro" : "maior nota primeiro"}):\n${rows
        .slice(0, 5)
        .map((r) => `- ${r.name}: nota ${r.score}`)
        .join("\n")}`;
    },
  },
  {
    test: (m) => /treinamento/.test(m) && (/venc|atrasad|pendent|precisa/.test(m)),
    handle: async (branchId) => {
      const compliance = await getTrainingCompliance(branchId);
      const due = compliance.filter((t) => t.status !== "valido");
      if (due.length === 0) return "Nenhum treinamento pendente, a vencer ou atrasado nesse escopo.";
      const labels: Record<string, string> = {
        atrasado: "atrasado",
        nunca_realizado: "nunca realizado",
        a_vencer: "a vencer",
      };
      return due
        .slice(0, 15)
        .map(
          (t) =>
            `- ${t.employee_name}: "${t.training_program_name}" (${labels[t.status]}${t.next_due_date ? `, vencimento ${formatDate(t.next_due_date)}` : ""})`
        )
        .join("\n");
    },
  },
  {
    test: (m) => /epi/.test(m) && /venc/.test(m),
    handle: async (branchId, msg) => {
      const admin = createAdminClient();
      const settings = await getAppSettings();
      const employees = await listScopedEmployees(branchId);
      const { data } = await admin
        .from("ppe_deliveries")
        .select("item, expiry_date, employee:employees!inner(id, name, branch_id)")
        .in(
          "employee_id",
          employees.map((e) => e.id)
        )
        .eq("active", true)
        .not("expiry_date", "is", null);
      const windowDays = extractWindowDays(msg);
      type PpeRow = { item: string; expiry_date: string; employee: { name: string } };
      const rows = ((data ?? []) as unknown as PpeRow[])
        .map((p) => ({ ...p, status: computeExpiryStatus(p.expiry_date, settings.compliance_alert_days) }))
        .filter((p) => p.status !== "valido" && daysUntil(p.expiry_date) <= windowDays);
      if (rows.length === 0) return `Nenhum EPI vencido ou vencendo nos próximos ${windowDays} dias.`;
      return rows.map((p) => `- ${p.item} (${p.employee.name}): ${p.status === "vencido" ? "vencido em" : "vence em"} ${formatDate(p.expiry_date)}`).join("\n");
    },
  },
  {
    test: (m) => /folha|salario|salário/.test(m) && /(total|quanto)/.test(m),
    handle: async (branchId) => {
      const now = new Date();
      const summary = await getPayrollSummary(branchId, now.getFullYear(), now.getMonth() + 1);
      const variation = summary.variation_pct !== null ? `${summary.variation_pct >= 0 ? "+" : ""}${summary.variation_pct.toFixed(1)}%` : "sem comparação";
      return `Folha de ${MONTH_NAMES[now.getMonth()]}: total líquido ${money(summary.current.net)} (variação vs. mês anterior: ${variation}).`;
    },
  },
  {
    test: (m) => /quant\w+ colaborador|tamanho da equipe|quantas pessoas/.test(m),
    handle: async (branchId) => {
      const employees = await listScopedEmployees(branchId, { onlyActive: true });
      return `${employees.length} colaboradores ativos nesse escopo.`;
    },
  },
  {
    test: (m) => /turnover|rotatividade/.test(m),
    handle: async (branchId) => {
      const series = await getTurnoverSeries(branchId, 1);
      const point = series[0];
      if (!point || point.rate_pct === null) return "Não há dados suficientes para calcular o turnover.";
      return `Turnover do mês atual: ${point.rate_pct.toFixed(1)}% (${point.terminations} desligamento(s) sobre um quadro médio de ${point.headcount_avg.toFixed(1)} pessoas).`;
    },
  },
  {
    test: (m) => /absenteismo|faltas/.test(m),
    handle: async (branchId) => {
      const series = await getAbsenteeismSeries(branchId, 1);
      const point = series[0];
      if (!point || point.rate_pct === null) return "Não há dados suficientes para calcular o absenteísmo.";
      return `Absenteísmo do mês atual: ${point.rate_pct.toFixed(1)}% (${point.absence_days} ausência(s) registrada(s)).`;
    },
  },
  {
    test: (m) => /enps|clima organizacional/.test(m),
    handle: async (branchId) => {
      const history = await getEnpsHistory(branchId);
      const last = history[history.length - 1];
      if (!last || last.enps === null) return "Ainda não há pesquisas de eNPS respondidas nesse escopo.";
      return `eNPS mais recente (${MONTH_NAMES[last.month - 1]}/${last.year}): ${last.enps.toFixed(0)} (${last.responses} resposta(s)).`;
    },
  },
  {
    test: (m) => /alerta/.test(m),
    handle: async (branchId) => {
      const alerts = await getAlerts(branchId);
      if (alerts.length === 0) return "Nenhum alerta ativo nesse escopo.";
      return alerts.slice(0, 8).map((a) => `- [${a.category}] ${a.message}`).join("\n");
    },
  },
];

const HELP_TEXT =
  'Posso responder sobre: banco de horas, horas extras, férias (vencendo/vencidas), avaliações de desempenho, treinamentos e EPI vencendo, folha do mês, quantidade de colaboradores, turnover, absenteísmo, eNPS e alertas gerais. Tente algo como "quem está com banco de horas mais alto?" ou "alguma férias vencendo essa semana?".';

export async function answerQuestion(message: string, branchId: string | null): Promise<string> {
  const normalized = normalize(message);
  for (const intent of intents) {
    if (intent.test(normalized)) {
      try {
        return await intent.handle(branchId, normalized);
      } catch (err) {
        console.error("Erro no assistente de chat:", err);
        return "Encontrei um problema ao consultar esse dado. Tente novamente.";
      }
    }
  }
  return HELP_TEXT;
}
