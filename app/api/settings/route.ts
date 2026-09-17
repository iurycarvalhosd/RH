import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";
import { getAppSettings } from "@/lib/calculations/settings";

const SettingsUpdate = z.object({
  hour_bank_limit_hours: z.number().nonnegative().optional(),
  hour_bank_attention_pct: z.number().min(0).max(100).optional(),
  vacation_alert_days: z.number().int().nonnegative().optional(),
  compliance_alert_days: z.number().int().nonnegative().optional(),
  performance_scale_min: z.number().optional(),
  performance_scale_max: z.number().optional(),
  payroll_variation_alert_pct: z.number().nonnegative().optional(),
});

export async function GET() {
  try {
    await requireProfile();
    const settings = await getAppSettings();
    return jsonOk(settings);
  } catch (e) {
    return apiErrorResponse(e);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireRole("admin");
    const body = SettingsUpdate.parse(await request.json());
    const admin = createAdminClient();
    const { data, error } = await admin.from("app_settings").update(body).eq("id", 1).select().single();
    if (error) throw error;
    return jsonOk(data);
  } catch (e) {
    return apiErrorResponse(e);
  }
}
