import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// O plano gratuito do Supabase pausa o projeto após 7 dias sem requisições;
// a Vercel chama esta rota uma vez por dia (vercel.json) para mantê-lo ativo.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("branches").select("id").limit(1);
  if (error) {
    console.error("keep-alive: falha ao consultar o Supabase:", error.message);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
