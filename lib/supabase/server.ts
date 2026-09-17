import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Client autenticado como o usuário logado (via cookies da sessão), usado
// só para descobrir "quem é o usuário atual" (supabase.auth.getUser()).
// Toda leitura/escrita de dados de negócio passa pelo admin client.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component sem permissão de escrita de
            // cookies - ok, o proxy.ts já cuida de renovar a sessão.
          }
        },
      },
    }
  );
}
