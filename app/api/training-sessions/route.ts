import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";

const AttendeeInput = z.object({
  employee_id: z.string().uuid(),
  attended: z.boolean().default(true),
});

const SessionInput = z.object({
  training_program_id: z.string().uuid(),
  session_date: z.string().min(1),
  location: z.string().nullable().optional(),
  instructor: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  attendees: z.array(AttendeeInput).default([]),
});

const SELECT = `
  *,
  training_program:training_programs(id, name, periodicity),
  attendees:training_session_attendees(
    id, employee_id, attended, created_at,
    employee:employees(id, name, branch_id, branch:branches(name), position:job_positions(title))
  )
`;

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const admin = createAdminClient();
    const { data, error } = await admin.from("training_sessions").select(SELECT).order("session_date", { ascending: false });
    if (error) throw error;

    type Row = { attendees: Array<{ employee: { branch_id: string } | null }> };
    const rows = (data ?? []) as unknown as Row[];
    const filtered = branchId
      ? rows.filter((row) => row.attendees.some((a) => a.employee?.branch_id === branchId))
      : rows;

    return jsonOk(filtered);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = SessionInput.parse(await request.json());
    const admin = createAdminClient();

    const { data: session, error } = await admin
      .from("training_sessions")
      .insert({
        training_program_id: body.training_program_id,
        session_date: body.session_date,
        location: body.location ?? null,
        instructor: body.instructor ?? null,
        notes: body.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    if (body.attendees.length > 0) {
      const { error: attendeesError } = await admin.from("training_session_attendees").insert(
        body.attendees.map((a) => ({
          training_session_id: session.id,
          employee_id: a.employee_id,
          attended: a.attended,
        }))
      );
      if (attendeesError) throw attendeesError;
    }

    const { data: full, error: fullError } = await admin.from("training_sessions").select(SELECT).eq("id", session.id).single();
    if (fullError) throw fullError;

    return jsonOk(full, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
