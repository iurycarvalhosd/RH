import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16 renomeou "Middleware" para "Proxy" (mesmo arquivo/conceito).
// Roda em toda navegação de página, exceto assets estáticos e /api - as
// rotas de API fazem sua própria checagem (retornam 401/403 em JSON em vez
// de redirecionar para /login).
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
