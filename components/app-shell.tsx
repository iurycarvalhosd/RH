"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { ReactNode } from "react";
import { BranchProvider, NETWORK_SCOPE, useBranch } from "@/lib/branch-context";
import { ProfileProvider } from "@/lib/profile-context";
import { ChatPanel } from "@/components/chat-panel";
import { apiGet } from "@/lib/client/api";
import type { Branch, Profile } from "@/lib/types";

const NAV_ITEMS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/", label: "Visão geral" },
  { href: "/filiais", label: "Filiais" },
  { href: "/equipe", label: "Equipe" },
  { href: "/ponto", label: "Ponto" },
  { href: "/ferias", label: "Férias" },
  { href: "/folha", label: "Folha" },
  { href: "/desempenho", label: "Desempenho" },
  { href: "/compliance", label: "Compliance" },
  { href: "/indicadores", label: "Indicadores" },
  { href: "/cargos", label: "Cargos" },
  { href: "/onboarding", label: "Onboarding" },
  { href: "/desligamentos", label: "Desligamentos" },
  { href: "/usuarios", label: "Usuários", adminOnly: true },
  { href: "/configuracoes", label: "Configurações", adminOnly: true },
];

export function AppShell({
  profile,
  branches,
  initialBranchId,
  children,
}: {
  profile: Profile;
  branches: Branch[];
  initialBranchId: string;
  children: ReactNode;
}) {
  return (
    <ProfileProvider profile={profile}>
      <BranchProvider branches={branches} initialBranchId={initialBranchId}>
        <div className="app-shell">
          <Sidebar profile={profile} />
          <main className="main-content">
            <ContentHeader profile={profile} />
            {children}
          </main>
          <ChatPanel />
        </div>
      </BranchProvider>
    </ProfileProvider>
  );
}

function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SM</div>
        <div className="brand-text">
          <strong>Sheila Morais</strong>
          <span>RH</span>
        </div>
      </div>

      <p className="sidebar-label">Módulos</p>
      <nav className="sidebar-nav">
        {NAV_ITEMS.filter((item) => !item.adminOnly || profile.role === "admin").map((item) => (
          <Link key={item.href} href={item.href} data-active={pathname === item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <SidebarHighlight />
    </aside>
  );
}

function SidebarHighlight() {
  const { activeBranchId } = useBranch();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet("/api/employees", { branchId: activeBranchId, status: "active" })
      .then((data) => {
        if (!cancelled) setCount(Array.isArray(data) ? data.length : null);
      })
      .catch(() => {
        if (!cancelled) setCount(null);
      });
    return () => {
      cancelled = true;
    };
  }, [activeBranchId]);

  return (
    <div className="sidebar-highlight">
      <div className="value">{count === null ? "…" : count}</div>
      <div className="label">Equipe ativa</div>
    </div>
  );
}

function ContentHeader({ profile }: { profile: Profile }) {
  const router = useRouter();
  const { branches, activeBranchId, setActiveBranchId } = useBranch();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="content-header">
      <select
        className="scope-select"
        aria-label="Filial ativa"
        value={activeBranchId}
        onChange={(e) => setActiveBranchId(e.target.value)}
      >
        <option value={NETWORK_SCOPE}>Rede toda</option>
        {branches.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name}
          </option>
        ))}
      </select>
      <div className="content-header-spacer" />
      <div className="topbar-user">
        <span>
          {profile.name} <span className="muted">({profile.role === "admin" ? "admin" : "RH"})</span>
        </span>
        <button onClick={handleLogout}>Sair</button>
      </div>
    </div>
  );
}
