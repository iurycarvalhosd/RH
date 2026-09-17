import { NextResponse, type NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, ApiError } from "@/lib/auth/rbac";
import { apiErrorResponse } from "@/lib/api-helpers";
import { PpeReceiptDocument, type PpeReceiptData } from "@/lib/pdf/ppe-receipt";

type Params = { params: Promise<{ id: string }> };

interface PpeReceiptRow {
  item: string;
  ca_number: string;
  delivery_date: string;
  expiry_date: string | null;
  employee: {
    name: string;
    position: { title: string } | null;
    branch: { name: string; address: string | null; cnpj: string | null } | null;
  } | null;
}

// Fora do try/catch de propósito: ver nota em app/api/payroll/report/route.tsx.
function renderReceiptPdf(data: PpeReceiptData) {
  return renderToBuffer(<PpeReceiptDocument data={data} />);
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireProfile();
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("ppe_deliveries")
      .select(
        "item, ca_number, delivery_date, expiry_date, employee:employees(name, position:job_positions(title), branch:branches(name, address, cnpj))"
      )
      .eq("id", id)
      .single();
    if (error || !data) throw new ApiError(404, "Entrega de EPI não encontrada.");

    const row = data as unknown as PpeReceiptRow;
    const receiptData: PpeReceiptData = {
      employeeName: row.employee?.name ?? "-",
      positionTitle: row.employee?.position?.title ?? null,
      branchName: row.employee?.branch?.name ?? "-",
      branchAddress: row.employee?.branch?.address ?? null,
      branchCnpj: row.employee?.branch?.cnpj ?? null,
      item: row.item,
      caNumber: row.ca_number,
      deliveryDate: row.delivery_date,
      expiryDate: row.expiry_date,
    };

    const buffer = await renderReceiptPdf(receiptData);
    const safeName = receiptData.employeeName.replace(/[^\p{L}\p{N}]+/gu, "-");

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="recibo-epi-${safeName}.pdf"`,
      },
    });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
