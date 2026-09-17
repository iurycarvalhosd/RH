"use client";

import { useBranch } from "@/lib/branch-context";

export function ScopeIndicator() {
  const { activeBranchLabel, isNetworkScope } = useBranch();
  return (
    <p className="scope-indicator">
      Mostrando: <strong>{isNetworkScope ? "Rede toda (consolidado)" : activeBranchLabel}</strong>
    </p>
  );
}
