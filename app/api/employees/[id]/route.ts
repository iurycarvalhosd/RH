import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const EmployeeUpdate = z.object({
  branch_id: z.string().uuid().optional(),
  position_id: z.string().uuid().nullable().optional(),
  name: z.string().min(1).optional(),
  hire_date: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  phone: z.string().nullable().optional(),
  cpf: z.string().nullable().optional(),
  rg: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional().or(z.literal("")),
  nationality: z.string().min(1).optional(),
  marital_status: z.enum(["solteiro", "casado", "divorciado", "viuvo", "uniao_estavel"]).nullable().optional(),
  address: z.string().nullable().optional(),
  ctps_number: z.string().nullable().optional(),
  ctps_series: z.string().nullable().optional(),
  pis_pasep: z.string().nullable().optional(),
  base_salary: z.coerce.number().nullable().optional(),
  work_schedule: z.string().nullable().optional(),
  contract_type: z.enum(["experiencia", "indeterminado"]).optional(),
  experience_end_date: z.string().nullable().optional().or(z.literal("")),
});

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireProfile();
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employees")
      .select("*, branch:branches(id, name), position:job_positions(id, title)")
      .eq("id", id)
      .single();
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const parsed = EmployeeUpdate.parse(await request.json());
    const body = {
      ...parsed,
      email: parsed.email === "" ? null : parsed.email,
      birth_date: parsed.birth_date === "" ? null : parsed.birth_date,
      experience_end_date:
        parsed.contract_type === "indeterminado"
          ? null
          : parsed.experience_end_date === ""
            ? null
            : parsed.experience_end_date,
    };
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("employees")
      .update(body)
      .eq("id", id)
      .select("*, branch:branches(id, name), position:job_positions(id, title)")
      .single();
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const admin = createAdminClient();
    const { error } = await admin.from("employees").delete().eq("id", id);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
