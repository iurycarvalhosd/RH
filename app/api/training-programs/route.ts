import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const ProgramInput = z.object({
  name: z.string().min(1, "Nome é obrigatório."),
  periodicity: z.enum(["semanal", "mensal", "semestral", "anual"]),
  applies_to_all_positions: z.boolean().default(false),
  position_ids: z.array(z.string().uuid()).default([]),
});

export async function GET() {
  try {
    await requireProfile();
    const admin = createAdminClient();
    const { data: programs, error } = await admin.from("training_programs").select("*").order("name");
    if (error) throw error;

    const { data: links, error: linksError } = await admin
      .from("training_program_positions")
      .select("training_program_id, position_id, position:job_positions(title)");
    if (linksError) throw linksError;

    type LinkRow = { training_program_id: string; position_id: string; position: { title: string } | null };
    const byProgram = new Map<string, LinkRow[]>();
    for (const link of (links ?? []) as unknown as LinkRow[]) {
      const arr = byProgram.get(link.training_program_id) ?? [];
      arr.push(link);
      byProgram.set(link.training_program_id, arr);
    }

    const rows = (programs ?? []).map((p) => {
      const linksForProgram = byProgram.get(p.id) ?? [];
      return {
        ...p,
        position_ids: linksForProgram.map((l) => l.position_id),
        position_titles: linksForProgram.map((l) => l.position?.title ?? "-"),
      };
    });

    return jsonOk(rows);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = ProgramInput.parse(await request.json());
    const admin = createAdminClient();

    const { data: program, error } = await admin
      .from("training_programs")
      .insert({
        name: body.name,
        periodicity: body.periodicity,
        applies_to_all_positions: body.applies_to_all_positions,
      })
      .select()
      .single();
    if (error) throw error;

    if (!body.applies_to_all_positions && body.position_ids.length > 0) {
      const { error: linkError } = await admin
        .from("training_program_positions")
        .insert(body.position_ids.map((position_id) => ({ training_program_id: program.id, position_id })));
      if (linkError) throw linkError;
    }

    return jsonOk(program, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
