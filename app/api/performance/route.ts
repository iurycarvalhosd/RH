import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";

const CriteriaScoreInput = z.object({
  label: z.string().min(1),
  score: z.number(),
  comment: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
});

const ReviewInput = z.object({
  employee_id: z.string().uuid(),
  review_date: z.string().min(1),
  notes: z.string().nullable().optional(),
  template_id: z.string().uuid().nullable().optional(),
  // Avaliação livre: informa score diretamente. Avaliação por modelo:
  // informa criteria_scores e o score final é a média dos critérios.
  score: z.number().optional(),
  criteria_scores: z.array(CriteriaScoreInput).optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const employeeId = request.nextUrl.searchParams.get("employeeId");

    const admin = createAdminClient();
    let query = admin
      .from("performance_reviews")
      .select("*, employee:employees!inner(id, name, branch_id), criteria_scores:performance_review_criteria_scores(*)")
      .order("review_date", { ascending: false });
    if (employeeId) query = query.eq("employee_id", employeeId);
    if (branchId) query = query.eq("employee.branch_id", branchId);

    const { data, error } = await query;
    if (error) throw error;

    type Row = { criteria_scores: Array<{ sort_order: number }> };
    const rows = ((data ?? []) as unknown as Row[]).map((row) => ({
      ...row,
      criteria_scores: [...row.criteria_scores].sort((a, b) => a.sort_order - b.sort_order),
    }));
    return jsonOk(rows);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = ReviewInput.parse(await request.json());

    const hasCriteria = body.criteria_scores && body.criteria_scores.length > 0;
    const finalScore = hasCriteria
      ? body.criteria_scores!.reduce((a, c) => a + c.score, 0) / body.criteria_scores!.length
      : body.score;

    if (finalScore === undefined) {
      return apiErrorResponse(new Error("Informe uma nota ou os critérios do modelo de avaliação."));
    }

    const admin = createAdminClient();
    const { data: review, error } = await admin
      .from("performance_reviews")
      .insert({
        employee_id: body.employee_id,
        review_date: body.review_date,
        notes: body.notes ?? null,
        template_id: body.template_id ?? null,
        score: finalScore,
      })
      .select()
      .single();
    if (error) throw error;

    if (hasCriteria) {
      const { error: criteriaError } = await admin
        .from("performance_review_criteria_scores")
        .insert(body.criteria_scores!.map((c) => ({ ...c, performance_review_id: review.id })));
      if (criteriaError) throw criteriaError;
    }

    return jsonOk(review, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
