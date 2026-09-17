import "server-only";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface PayrollReportRow {
  employeeName: string;
  branchName: string;
  baseSalary: number;
  credits: number;
  debits: number;
  netValue: number;
}

export interface PayrollReportData {
  scopeLabel: string;
  periodLabel: string;
  rows: PayrollReportRow[];
  closedAt: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#111827" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center" },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 14 },
  subtitle: { fontSize: 9, textAlign: "center", color: "#6b7280", marginTop: 3, marginBottom: 4 },
  divider: { borderBottom: "1pt solid #9ca3af", marginTop: 12, marginBottom: 10 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderTop: "1pt solid #9ca3af",
    borderBottom: "1pt solid #9ca3af",
    paddingVertical: 5,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: { flexDirection: "row", borderBottom: "1pt solid #d1d5db", paddingVertical: 6 },
  totalRow: {
    flexDirection: "row",
    borderTop: "1.5pt solid #111827",
    paddingVertical: 7,
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
  colName: { width: 130, paddingHorizontal: 4 },
  colBranch: { width: 90, paddingHorizontal: 4 },
  colMoney: { width: 90, paddingHorizontal: 4, textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7.5,
    color: "#9ca3af",
    textAlign: "center",
  },
});

function money(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function PayrollReportDocument({ data }: { data: PayrollReportData }) {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const totals = data.rows.reduce(
    (acc, r) => ({
      baseSalary: acc.baseSalary + r.baseSalary,
      credits: acc.credits + r.credits,
      debits: acc.debits + r.debits,
      netValue: acc.netValue + r.netValue,
    }),
    { baseSalary: 0, credits: 0, debits: 0, netValue: 0 }
  );

  return (
    <Document title={`Folha de pagamento - ${data.periodLabel}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.companyName}>SHEILA MORAIS</Text>
        <Text style={styles.title}>RELATÓRIO DE FOLHA DE PAGAMENTO</Text>
        <Text style={styles.subtitle}>
          {data.scopeLabel} · Período: {data.periodLabel}
          {data.closedAt ? ` · Folha fechada em ${new Date(data.closedAt).toLocaleDateString("pt-BR")}` : " · Folha em aberto"}
        </Text>
        <View style={styles.divider} />

        <View style={styles.tableHeader}>
          <Text style={styles.colName}>Colaborador</Text>
          <Text style={styles.colBranch}>Filial</Text>
          <Text style={styles.colMoney}>Salário base</Text>
          <Text style={styles.colMoney}>Créditos</Text>
          <Text style={styles.colMoney}>Débitos</Text>
          <Text style={styles.colMoney}>A pagar</Text>
        </View>
        {data.rows.map((r, idx) => (
          <View style={styles.tableRow} key={idx} wrap={false}>
            <Text style={styles.colName}>{r.employeeName}</Text>
            <Text style={styles.colBranch}>{r.branchName}</Text>
            <Text style={styles.colMoney}>{money(r.baseSalary)}</Text>
            <Text style={styles.colMoney}>{money(r.credits)}</Text>
            <Text style={styles.colMoney}>{money(r.debits)}</Text>
            <Text style={styles.colMoney}>{money(r.netValue)}</Text>
          </View>
        ))}
        <View style={styles.totalRow} wrap={false}>
          <Text style={styles.colName}>TOTAL</Text>
          <Text style={styles.colBranch}></Text>
          <Text style={styles.colMoney}>{money(totals.baseSalary)}</Text>
          <Text style={styles.colMoney}>{money(totals.credits)}</Text>
          <Text style={styles.colMoney}>{money(totals.debits)}</Text>
          <Text style={styles.colMoney}>{money(totals.netValue)}</Text>
        </View>

        <Text style={styles.footer}>Documento gerado pelo sistema de RH da Sheila Morais em {generatedAt}.</Text>
      </Page>
    </Document>
  );
}
