import { requireAdminPage } from "@/lib/auth/dal";
import { UsuariosClient } from "./usuarios-client";

export default async function UsuariosPage() {
  await requireAdminPage();
  return <UsuariosClient />;
}
