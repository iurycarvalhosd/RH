import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, ApiError } from "@/lib/auth/rbac";
import { apiErrorResponse } from "@/lib/api-helpers";
import { EmploymentContractDocument, type EmploymentContractData } from "@/lib/pdf/employment-contract";
import type { ContractType, MaritalStatus } from "@/lib/types";

const MARITAL_STATUS_LABEL: Record<MaritalStatus, string> = {
  solteiro: "Solteiro(a)",
  casado: "Casado(a)",
  divorciado: "Divorciado(a)",
  viuvo: "Viúvo(a)",
  uniao_estavel: "União estável",
};

type Params = { params: Promise<{ id: string }> };

interface EmployeeRow {
  name: string;
  hire_date: string;
  cpf: string | null;
  rg: string | null;
  birth_date: string | null;
  nationality: string;
  marital_status: MaritalStatus | null;
  address: string | null;
  ctps_number: string | null;
  ctps_series: string | null;
  pis_pasep: string | null;
  base_salary: number | null;
  work_schedule: string | null;
  contract_type: ContractType;
  experience_end_date: string | null;
  position: { title: string } | null;
  branch: { name: string; address: string | null; cnpj: string | null; manager_name: string | null } | null;
}

// Fora do try/catch de propósito: ver nota em app/api/payroll/report/route.tsx.
function renderContractPdf(data: EmploymentContractData) {
  return renderToBuffer(<EmploymentContractDocument data={data} />);
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireProfile();
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employees")
      .select(
        "name, hire_date, cpf, rg, birth_date, nationality, marital_status, address, ctps_number, ctps_series, pis_pasep, base_salary, work_schedule, contract_type, experience_end_date, position:job_positions(title), branch:branches(name, address, cnpj, manager_name)"
      )
      .eq("id", id)
      .single();
    if (error || !data) throw new ApiError(404, "Colaborador não encontrado.");

    const row = data as unknown as EmployeeRow;

    const missing: string[] = [];
    if (!row.cpf) missing.push("CPF");
    if (!row.rg) missing.push("RG");
    if (!row.birth_date) missing.push("data de nascimento");
    if (!row.address) missing.push("endereço");
    if (!row.ctps_number) missing.push("CTPS");
    if (row.base_salary == null) missing.push("salário contratual");
    if (row.contract_type === "experiencia" && !row.experience_end_date) missing.push("término do período de experiência");
    if (missing.length > 0) {
      throw new ApiError(
        400,
        `Complete os dados do colaborador antes de gerar o contrato: ${missing.join(", ")}.`
      );
    }

    const contractData: EmploymentContractData = {
      branchName: row.branch?.name ?? "-",
      branchAddress: row.branch?.address ?? null,
      branchCnpj: row.branch?.cnpj ?? null,
      employerRepName: row.branch?.manager_name ?? null,
      employeeName: row.name,
      nationality: row.nationality,
      maritalStatusLabel: row.marital_status ? MARITAL_STATUS_LABEL[row.marital_status] : null,
      birthDate: row.birth_date,
      cpf: row.cpf,
      rg: row.rg,
      ctpsNumber: row.ctps_number,
      ctpsSeries: row.ctps_series,
      pisPasep: row.pis_pasep,
      address: row.address,
      positionTitle: row.position?.title ?? null,
      hireDate: row.hire_date,
      contractType: row.contract_type,
      experienceEndDate: row.experience_end_date,
      baseSalary: row.base_salary,
      workSchedule: row.work_schedule,
    };

    const buffer = await renderContractPdf(contractData);
    const safeName = contractData.employeeName.replace(/[^\p{L}\p{N}]+/gu, "-");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="contrato-trabalho-${safeName}.pdf"`,
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
