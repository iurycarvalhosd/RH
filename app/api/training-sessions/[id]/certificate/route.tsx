import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, ApiError } from "@/lib/auth/rbac";
import { apiErrorResponse } from "@/lib/api-helpers";
import { TrainingCertificateDocument, type TrainingCertificateData } from "@/lib/pdf/training-certificate";
import type { TrainingPeriodicity } from "@/lib/types";

const PERIODICITY_LABEL: Record<TrainingPeriodicity, string> = {
  semanal: "Semanal",
  mensal: "Mensal",
  semestral: "Semestral",
  anual: "Anual",
};

type Params = { params: Promise<{ id: string }> };

interface SessionRow {
  session_date: string;
  location: string | null;
  instructor: string | null;
  training_program: { name: string; periodicity: TrainingPeriodicity } | null;
  attendees: Array<{
    attended: boolean;
    employee: {
      name: string;
      branch: { id: string; name: string; address: string | null; cnpj: string | null } | null;
      position: { title: string } | null;
    } | null;
  }>;
}

// Fora do try/catch de propósito: ver nota em app/api/payroll/report/route.tsx.
function renderCertificatePdf(data: TrainingCertificateData) {
  return renderToBuffer(<TrainingCertificateDocument data={data} />);
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireProfile();
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("training_sessions")
      .select(
        "session_date, location, instructor, training_program:training_programs(name, periodicity), attendees:training_session_attendees(attended, employee:employees(name, branch:branches(id, name, address, cnpj), position:job_positions(title)))"
      )
      .eq("id", id)
      .single();
    if (error || !data) throw new ApiError(404, "Sessão de treinamento não encontrada.");

    const row = data as unknown as SessionRow;
    const attendedList = row.attendees.filter((a) => a.attended && a.employee);
    const distinctBranchIds = new Set(attendedList.map((a) => a.employee!.branch?.id).filter(Boolean));
    const singleBranch = distinctBranchIds.size === 1 ? attendedList[0].employee!.branch : null;

    const certificateData: TrainingCertificateData = {
      programName: row.training_program?.name ?? "-",
      periodicityLabel: row.training_program ? PERIODICITY_LABEL[row.training_program.periodicity] : "-",
      sessionDate: row.session_date,
      location: row.location,
      instructor: row.instructor,
      branchAddress: singleBranch?.address ?? null,
      branchCnpj: singleBranch?.cnpj ?? null,
      attendees: attendedList.map((a) => ({
        name: a.employee!.name,
        positionTitle: a.employee!.position?.title ?? null,
        branchName: a.employee!.branch?.name ?? "-",
      })),
    };

    const buffer = await renderCertificatePdf(certificateData);
    const safeName = certificateData.programName.replace(/[^\p{L}\p{N}]+/gu, "-");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="ata-treinamento-${safeName}.pdf"`,
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
