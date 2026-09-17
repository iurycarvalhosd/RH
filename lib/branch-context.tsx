"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Branch } from "@/lib/types";

const COOKIE_NAME = "activeBranchId";
export const NETWORK_SCOPE = "all";

interface BranchContextValue {
  branches: Branch[];
  activeBranchId: string; // NETWORK_SCOPE ("all") ou o uuid da filial
  activeBranchLabel: string;
  isNetworkScope: boolean;
  setActiveBranchId: (id: string) => void;
}

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({
  branches,
  initialBranchId,
  children,
}: {
  branches: Branch[];
  initialBranchId: string;
  children: ReactNode;
}) {
  const validInitial =
    initialBranchId === NETWORK_SCOPE || branches.some((b) => b.id === initialBranchId)
      ? initialBranchId
      : NETWORK_SCOPE;
  const [activeBranchId, setActiveBranchIdState] = useState(validInitial);

  const setActiveBranchId = useCallback((id: string) => {
    setActiveBranchIdState(id);
    if (typeof document !== "undefined") {
      document.cookie = `${COOKIE_NAME}=${id}; path=/; max-age=${60 * 60 * 24 * 365}`;
    }
  }, []);

  const activeBranchLabel = useMemo(() => {
    if (activeBranchId === NETWORK_SCOPE) return "Rede toda";
    return branches.find((b) => b.id === activeBranchId)?.name ?? "Rede toda";
  }, [activeBranchId, branches]);

  const value = useMemo<BranchContextValue>(
    () => ({
      branches,
      activeBranchId,
      activeBranchLabel,
      isNetworkScope: activeBranchId === NETWORK_SCOPE,
      setActiveBranchId,
    }),
    [branches, activeBranchId, activeBranchLabel, setActiveBranchId]
  );

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const ctx = useContext(BranchContext);
  if (!ctx) throw new Error("useBranch precisa estar dentro de <BranchProvider>.");
  return ctx;
}
