"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { ScopeIndicator } from "@/components/scope-indicator";

const TABS = [
  { href: "/compliance/atestados", label: "Atestados" },
  { href: "/compliance/epi", label: "Entrega de EPI" },
  { href: "/compliance/treinamentos", label: "Treinamentos de SST" },
  { href: "/compliance/documentos", label: "Documentos e exames" },
];

export default function ComplianceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <h1>Compliance e segurança</h1>
      <ScopeIndicator />
      <div className="tabs">
        {TABS.map((tab) => (
          <Link key={tab.href} href={tab.href} data-active={pathname === tab.href}>
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
