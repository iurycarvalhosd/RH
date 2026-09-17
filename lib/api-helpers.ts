import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/auth/rbac";
import { ZodError } from "zod";

// Filtro global de filial/rede: branchId=all (ou ausente) => rede toda,
// sem filtro (retorna null). Qualquer outro valor é o uuid da filial.
export function getBranchFilter(request: NextRequest): string | null {
  const branchId = request.nextUrl.searchParams.get("branchId");
  if (!branchId || branchId === "all") return null;
  return branchId;
}

export function getPeriodFilter(request: NextRequest): { year: number | null; month: number | null } {
  const year = request.nextUrl.searchParams.get("year");
  const month = request.nextUrl.searchParams.get("month");
  return {
    year: year ? Number(year) : null,
    month: month ? Number(month) : null,
  };
}

export function apiErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Dados inválidos.", details: error.flatten() },
      { status: 400 }
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Erro interno." }, { status: 500 });
}

export function jsonOk(data: unknown, init?: { status?: number }) {
  return NextResponse.json(data, { status: init?.status ?? 200 });
}
