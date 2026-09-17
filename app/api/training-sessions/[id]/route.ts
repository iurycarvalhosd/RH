import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const AttendeeInput = z.object({
  employee_id: z.string().uuid(),
  attended: z.boolean().default(true),
});

const SessionUpdate = z.object({
  session_date: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
  instructor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  attendees: z.array(AttendeeInput).optional(),
});

const SELECT = `
  *,
  training_program:training_programs(id, name, periodicity),
  attendees:training_session_attendees(
    id, employee_id, attended, created_at,
    employee:employees(id, name, branch_id, branch:branches(name), position:job_positions(title))
  )
`;

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const admin = createAdminClient();
    const { data, error } = await admin.from("training_sessions").select(SELECT).eq("id", id).single();
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
    const body = SessionUpdate.parse(await request.json());
    const admin = createAdminClient();

    const { attendees, ...fields } = body;
    if (Object.keys(fields).length > 0) {
      const { error } = await admin.from("training_sessions").update(fields).eq("id", id);
      if (error) throw error;
    }

    if (attendees !== undefined) {
      const { error: deleteError } = await admin.from("training_session_attendees").delete().eq("training_session_id", id);
      if (deleteError) throw deleteError;
      if (attendees.length > 0) {
        const { error: insertError } = await admin.from("training_session_attendees").insert(
          attendees.map((a) => ({ training_session_id: id, employee_id: a.employee_id, attended: a.attended }))
        );
        if (insertError) throw insertError;
      }
    }

    const { data, error } = await admin.from("training_sessions").select(SELECT).eq("id", id).single();
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
    const { error } = await admin.from("training_sessions").delete().eq("id", id);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
