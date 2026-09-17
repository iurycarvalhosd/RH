import { type NextRequest } from "next/server";
import { z } from "zod";
import { requireProfile } from "@/lib/auth/rbac";
import { apiErrorResponse, jsonOk } from "@/lib/api-helpers";
import { answerQuestion } from "@/lib/chat/engine";

const ChatInput = z.object({
  message: z.string().min(1),
  branchId: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    await requireProfile();
    const body = ChatInput.parse(await request.json());
    const branchId = !body.branchId || body.branchId === "all" ? null : body.branchId;
    const answer = await answerQuestion(body.message, branchId);
    return jsonOk({ answer });
  } catch (e) {
    return apiErrorResponse(e);
  }
}
