import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";

const AnswerInput = z.object({ question: z.string().min(1), answer: z.string().nullable().optional() });

const TerminationInput = z.object({
  employee_id: z.string().uuid(),
  termination_date: z.string().min(1),
  reason_type: z.enum(["voluntario", "involuntario"]),
  reason_notes: z.string().nullable().optional(),
  exit_interview: z.array(AnswerInput).default([]),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const admin = createAdminClient();
    let query = admin
      .from("terminations")
      .select("*, employee:employees!inner(id, name, branch_id), exit_interview_answers(*)")
      .order("termination_date", { ascending: false });
    if (branchId) query = query.eq("employee.branch_id", branchId);
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
    const body = TerminationInput.parse(await request.json());
    const admin = createAdminClient();

    const { data: termination, error } = await admin
      .from("terminations")
      .insert({
        employee_id: body.employee_id,
        termination_date: body.termination_date,
        reason_type: body.reason_type,
        reason_notes: body.reason_notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;

    const answers = body.exit_interview.filter((a) => a.question.trim());
    if (answers.length > 0) {
      const { error: answersError } = await admin
        .from("exit_interview_answers")
        .insert(answers.map((a) => ({ ...a, termination_id: termination.id })));
      if (answersError) throw answersError;
    }

    await admin.from("employees").update({ status: "inactive" }).eq("id", body.employee_id);

    return jsonOk(termination, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
