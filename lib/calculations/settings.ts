import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppSettings } from "@/lib/types";

const FALLBACK_SETTINGS: AppSettings = {
  id: 1,
  hour_bank_limit_hours: 10,
  hour_bank_attention_pct: 80,
  vacation_alert_days: 30,
  compliance_alert_days: 30,
  performance_scale_min: 0,
  performance_scale_max: 10,
  payroll_variation_alert_pct: 10,
  updated_at: new Date().toISOString(),
};

export async function getAppSettings(): Promise<AppSettings> {
  const admin = createAdminClient();
  const { data } = await admin.from("app_settings").select("*").eq("id", 1).maybeSingle();
  return (data as AppSettings) ?? FALLBACK_SETTINGS;
}
