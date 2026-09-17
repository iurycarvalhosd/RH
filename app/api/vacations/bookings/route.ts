import { type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth/rbac";
import { ApiError } from "@/lib/auth/rbac";
import { apiErrorResponse, getBranchFilter, jsonOk } from "@/lib/api-helpers";

const BookingInput = z.object({
  vacation_period_id: z.string().uuid(),
  employee_id: z.string().uuid(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  days: z.number().positive(),
});

export async function GET(request: NextRequest) {
  try {
    await requireProfile();
    const branchId = getBranchFilter(request);
    const employeeId = request.nextUrl.searchParams.get("employeeId");
    const periodId = request.nextUrl.searchParams.get("periodId");

    const admin = createAdminClient();
    let query = admin
      .from("vacation_bookings")
      .select("*, employee:employees!inner(id, name, branch_id)")
      .order("start_date", { ascending: false });
    if (employeeId) query = query.eq("employee_id", employeeId);
    if (periodId) query = query.eq("vacation_period_id", periodId);
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
    const body = BookingInput.parse(await request.json());
    const admin = createAdminClient();

    const { data: period, error: periodError } = await admin
      .from("vacation_periods")
      .select("id, days_available, days_taken")
      .eq("id", body.vacation_period_id)
      .single();
    if (periodError) throw periodError;
    if (!period) throw new ApiError(404, "Período aquisitivo não encontrado.");

    const remaining = Number(period.days_available) - Number(period.days_taken);
    if (body.days > remaining) {
      throw new ApiError(400, `Saldo de férias insuficiente (disponível: ${remaining} dias).`);
    }

    const { data: booking, error: insertError } = await admin
      .from("vacation_bookings")
      .insert(body)
      .select()
      .single();
    if (insertError) throw insertError;

    const { error: updateError } = await admin
      .from("vacation_periods")
      .update({ days_taken: Number(period.days_taken) + body.days })
      .eq("id", body.vacation_period_id);
    if (updateError) throw updateError;

    return jsonOk(booking, { status: 201 });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
