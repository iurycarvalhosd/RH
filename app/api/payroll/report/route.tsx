import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter } from "@/lib/api-helpers";
import { PayrollReportDocument, type PayrollReportData } from "@/lib/pdf/payroll-report";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

interface RecordRow {
  base_salary: number;
  employee: { name: string; branch_id: string; branch: { name: string } | null } | null;
  benefits: Array<{ value: number }>;
  deductions: Array<{ value: number }>;
}

// Fora do try/catch de propósito: o linter do react-hooks trata qualquer
// JSX construído dentro de um try/catch como se fosse uma árvore React que
// precisaria de um error boundary, mas aqui é só entrada pro renderToBuffer
// do @react-pdf/renderer (renderização de PDF, não do DOM).
function renderReportPdf(data: PayrollReportData) {
  return renderToBuffer(<PayrollReportDocument data={data} />);
}

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const now = new Date();
    const year = Number(request.nextUrl.searchParams.get("year")) || now.getFullYear();
    const month = Number(request.nextUrl.searchParams.get("month")) || now.getMonth() + 1;

    const admin = createAdminClient();
    let query = admin
      .from("payroll_records")
      .select(
        "base_salary, employee:employees!inner(name, branch_id, branch:branches(name)), benefits:payroll_benefits(value), deductions:payroll_deductions(value)"
      )
      .eq("period_year", year)
      .eq("period_month", month)
      .order("period_year");
    if (branchId) query = query.eq("employee.branch_id", branchId);

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data as unknown as RecordRow[]).map((r) => {
      const credits = r.benefits.reduce((a, b) => a + Number(b.value), 0);
      const debits = r.deductions.reduce((a, d) => a + Number(d.value), 0);
      return {
        employeeName: r.employee?.name ?? "-",
        branchName: r.employee?.branch?.name ?? "-",
        baseSalary: Number(r.base_salary),
        credits,
        debits,
        netValue: Number(r.base_salary) + credits - debits,
      };
    });
    rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    let scopeLabel = "Rede toda (consolidado)";
    let scopeAddress: string | null = null;
    let scopeCnpj: string | null = null;
    let closedAt: string | null = null;
    if (branchId) {
      const { data: branch } = await admin.from("branches").select("name, address, cnpj").eq("id", branchId).single();
      scopeLabel = branch?.name ?? "Filial";
      scopeAddress = branch?.address ?? null;
      scopeCnpj = branch?.cnpj ?? null;
      const { data: closure } = await admin
        .from("payroll_closures")
        .select("closed_at")
        .eq("branch_id", branchId)
        .eq("period_year", year)
        .eq("period_month", month)
        .maybeSingle();
      closedAt = closure?.closed_at ?? null;
    }

    const reportData: PayrollReportData = {
      scopeLabel,
      scopeAddress,
      scopeCnpj,
      periodLabel: `${MONTH_NAMES[month - 1]}/${year}`,
      rows,
      closedAt,
    };

    const buffer = await renderReportPdf(reportData);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="folha-${year}-${String(month).padStart(2, "0")}.pdf"`,
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
