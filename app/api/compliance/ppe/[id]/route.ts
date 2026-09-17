import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

const PpeUpdate = z.object({
  item: z.string().min(1).optional(),
  ca_number: z.string().min(1).optional(),
  delivery_date: z.string().min(1).optional(),
  expiry_date: z.string().nullable().optional(),
  confirmed: z.boolean().optional(),
  active: z.boolean().optional(),
  closed_reason: z.enum(["substituido", "dispensado"]).nullable().optional(),
});

type Params = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const parsed = PpeUpdate.parse(await request.json());
    const body: Record<string, unknown> = { ...parsed };
    if (parsed.confirmed !== undefined) {
      body.confirmed_at = parsed.confirmed ? new Date().toISOString() : null;
    }
    if (parsed.active !== undefined) {
      body.closed_at = parsed.active ? null : new Date().toISOString();
      if (parsed.active) body.closed_reason = null;
    }
    const admin = createAdminClient();
    const { data, error } = await admin.from("ppe_deliveries").update(body).eq("id", id).select().single();
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
    const { error } = await admin.from("ppe_deliveries").delete().eq("id", id);
    if (error) throw error;
    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
