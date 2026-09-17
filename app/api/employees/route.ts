import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";

const EmployeeInput = z.object({
  branch_id: z.string().uuid("Selecione a filial."),
  position_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Nome é obrigatório."),
  hire_date: z.string().min(1, "Data de admissão é obrigatória."),
  status: z.enum(["active", "inactive"]).default("active"),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const status = request.nextUrl.searchParams.get("status");
    const admin = createAdminClient();
    let query = admin
      .from("employees")
      .select("*, branch:branches(id, name), position:job_positions(id, title)")
      .order("name");
    if (branchId) query = query.eq("branch_id", branchId);
    if (status === "active" || status === "inactive") query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const parsed = EmployeeInput.parse(await request.json());
    const body = { ...parsed, email: parsed.email || null };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employees")
      .insert(body)
      .select("*, branch:branches(id, name), position:job_positions(id, title)")
      .single();
    if (error) throw error;
    return jsonOk(data, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
