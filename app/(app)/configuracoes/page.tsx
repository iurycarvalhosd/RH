import { requireAdminPage } from "@/lib/auth/dal";
import { ConfiguracoesClient } from "./configuracoes-client";

export default async function ConfiguracoesPage() {
  await requireAdminPage();
  return <ConfiguracoesClient />;
}
