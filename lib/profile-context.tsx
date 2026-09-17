"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Profile } from "@/lib/types";

const ProfileContext = createContext<Profile | null>(null);

export function ProfileProvider({ profile, children }: { profile: Profile; children: ReactNode }) {
  return <ProfileContext.Provider value={profile}>{children}</ProfileContext.Provider>;
}

export function useProfile(): Profile {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile precisa estar dentro de <ProfileProvider>.");
  return ctx;
}

export function useIsAdmin(): boolean {
  return useProfile().role === "admin";
}
