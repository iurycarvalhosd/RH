import "server-only";

export type ExpiryStatus = "valido" | "a_vencer" | "vencido";

export function daysUntil(dateStr: string, today: Date = new Date()): number {
  const due = new Date(dateStr + "T00:00:00");
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.ceil((due.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));
}

export function computeExpiryStatus(expiresAt: string, alertDays: number, today: Date = new Date()): ExpiryStatus {
  const diff = daysUntil(expiresAt, today);
  if (diff < 0) return "vencido";
  if (diff <= alertDays) return "a_vencer";
  return "valido";
}
