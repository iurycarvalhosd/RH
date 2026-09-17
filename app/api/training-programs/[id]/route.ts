import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const ProgramUpdate = z.object({
  name: z.string().min(1).optional(),
  periodicity: z.enum(["semanal", "mensal", "semestral", "anual"]).optional(),
  applies_to_all_positions: z.boolean().optional(),
  position_ids: z.array(z.string().uuid()).optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const body = ProgramUpdate.parse(await request.json());
    const admin = createAdminClient();

    const { position_ids, ...fields } = body;
    if (Object.keys(fields).length > 0) {
      const { error } = await admin.from("training_programs").update(fields).eq("id", id);
      if (error) throw error;
    }

    if (position_ids !== undefined) {
      const { error: deleteError } = await admin.from("training_program_positions").delete().eq("training_program_id", id);
      if (deleteError) throw deleteError;
      if (position_ids.length > 0) {
        const { error: insertError } = await admin
          .from("training_program_positions")
          .insert(position_ids.map((position_id) => ({ training_program_id: id, position_id })));
        if (insertError) throw insertError;
      }
    }

    const { data, error } = await admin.from("training_programs").select("*").eq("id", id).single();
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
    const { error } = await admin.from("training_programs").delete().eq("id", id);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
