import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const CriterionInput = z.object({
  label: z.string().min(1),
  description: z.string().nullable().optional(),
  sort_order: z.number().int().default(0),
});

const TemplateUpdate = z.object({
  name: z.string().min(1).optional(),
  function_category: z.enum(["administrativo", "comercial", "producao", "servicos_gerais"]).optional(),
  criteria: z.array(CriterionInput).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = TemplateUpdate.parse(await request.json());
    const admin = createAdminClient();

    const { criteria, ...fields } = body;
    if (Object.keys(fields).length > 0) {
      const { error } = await admin.from("performance_review_templates").update(fields).eq("id", id);
      if (error) throw error;
    }

    if (criteria !== undefined) {
      const { error: deleteError } = await admin.from("performance_review_template_criteria").delete().eq("template_id", id);
      if (deleteError) throw deleteError;
      if (criteria.length > 0) {
        const { error: insertError } = await admin
          .from("performance_review_template_criteria")
          .insert(criteria.map((c) => ({ ...c, template_id: id })));
        if (insertError) throw insertError;
      }
    }

    const { data, error } = await admin
      .from("performance_review_templates")
      .select("*, criteria:performance_review_template_criteria(*)")
      .eq("id", id)
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
    const { error } = await admin.from("performance_review_templates").delete().eq("id", id);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
