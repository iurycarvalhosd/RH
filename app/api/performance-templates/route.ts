import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const CriterionInput = z.object({
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
});

const TemplateInput = z.object({
  name: z.string().min(1, "Nome é obrigatório."),
  function_category: z.enum(["administrativo", "comercial", "producao", "servicos_gerais"]),
  criteria: z.array(CriterionInput).min(1, "Adicione ao menos um critério."),
});

export async function GET() {
  try {
    await requireProfile();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("performance_review_templates")
      .select("*, criteria:performance_review_template_criteria(*)")
      .order("name");
    if (error) throw error;

    type Row = { criteria: Array<{ sort_order: number }> };
    const rows = ((data ?? []) as unknown as Row[]).map((row) => ({
      ...row,
      criteria: [...row.criteria].sort((a, b) => a.sort_order - b.sort_order),
    }));
    return jsonOk(rows);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = TemplateInput.parse(await request.json());
    const admin = createAdminClient();

    const { data: template, error } = await admin
      .from("performance_review_templates")
      .insert({ name: body.name, function_category: body.function_category })
      .select()
      .single();
    if (error) throw error;

    const { error: criteriaError } = await admin
      .from("performance_review_template_criteria")
      .insert(body.criteria.map((c) => ({ ...c, template_id: template.id })));
    if (criteriaError) throw criteriaError;

    return jsonOk(template, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
