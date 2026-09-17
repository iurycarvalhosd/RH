"use client";

import { useState } from "react";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function useCurrentPeriod() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  return { year, month, setYear, setMonth };
}

export function PeriodSelector({
  year,
  month,
  setYear,
  setMonth,
}: ReturnType<typeof useCurrentPeriod>) {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear - 2; y <= currentYear + 1; y++) years.push(y);

  return (
    <div className="toolbar">
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
        <label style={{ margin: 0 }}>Período:</label>
        <select aria-label="Mês" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTH_NAMES.map((name, idx) => (
            <option key={idx} value={idx + 1}>
              {name}
            </option>
          ))}
        </select>
        <select aria-label="Ano" value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
