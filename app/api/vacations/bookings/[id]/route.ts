import { type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireRole("admin");
    const { id } = await params;
    const admin = createAdminClient();

    const { data: booking, error: findError } = await admin
      .from("vacation_bookings")
      .select("vacation_period_id, days")
      .eq("id", id)
      .single();
    if (findError) throw findError;

    const { error: deleteError } = await admin.from("vacation_bookings").delete().eq("id", id);
    if (deleteError) throw deleteError;

    if (booking) {
      const { data: period } = await admin
        .from("vacation_periods")
        .select("days_taken")
        .eq("id", booking.vacation_period_id)
        .single();
      if (period) {
        await admin
          .from("vacation_periods")
          .update({ days_taken: Math.max(0, Number(period.days_taken) - Number(booking.days)) })
          .eq("id", booking.vacation_period_id);
      }
    }

    return jsonOk({ ok: true });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
