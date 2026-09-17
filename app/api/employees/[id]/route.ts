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
    const body = { ...parsed, email: parsed.email === "" ? null : parsed.email };
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
