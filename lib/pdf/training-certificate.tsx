import "server-only";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface TrainingCertificateAttendee {
  name: string;
  positionTitle: string | null;
  branchName: string;
}

export interface TrainingCertificateData {
  programName: string;
  periodicityLabel: string;
  sessionDate: string;
  location: string | null;
  instructor: string | null;
  attendees: TrainingCertificateAttendee[];
  branchAddress: string | null;
  branchCnpj: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 9.5, fontFamily: "Helvetica", color: "#111827" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center" },
  branchLine: { fontSize: 9, textAlign: "center", color: "#4b5563", marginTop: 2 },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 16 },
  subtitle: { fontSize: 8.5, textAlign: "center", color: "#6b7280", marginTop: 3, marginBottom: 4 },
  divider: { borderBottom: "1pt solid #9ca3af", marginTop: 12, marginBottom: 10 },
  infoRow: { flexDirection: "row", marginBottom: 5 },
  infoLabel: { width: 150, fontFamily: "Helvetica-Bold", color: "#374151" },
  infoValue: { flex: 1 },
  declaration: { marginTop: 14, marginBottom: 14, lineHeight: 1.5, textAlign: "justify", color: "#1f2937" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderTop: "1pt solid #9ca3af",
    borderBottom: "1pt solid #9ca3af",
    paddingVertical: 5,
    fontFamily: "Helvetica-Bold",
  },
  tableRow: {
    flexDirection: "row",
    borderBottom: "1pt solid #d1d5db",
    paddingVertical: 7,
    minHeight: 26,
  },
  colNum: { width: 24, paddingHorizontal: 4 },
  colName: { width: 150, paddingHorizontal: 4 },
  colPosition: { width: 110, paddingHorizontal: 4 },
  colBranch: { width: 90, paddingHorizontal: 4 },
  colSignature: { flex: 1, paddingHorizontal: 4 },
  instructorBlock: { marginTop: 44 },
  signatureLine: { borderTop: "1pt solid #111827", width: 260 },
  signatureCaption: { fontSize: 8.5, color: "#4b5563", marginTop: 4 },
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

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export function TrainingCertificateDocument({ data }: { data: TrainingCertificateData }) {
  const generatedAt = new Date().toLocaleString("pt-BR");

  return (
    <Document title={`Ata de treinamento - ${data.programName}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.companyName}>SHEILA MORAIS</Text>
        {(data.branchAddress || data.branchCnpj) && (
          <Text style={styles.branchLine}>
            {data.branchAddress ?? ""}
            {data.branchCnpj ? `${data.branchAddress ? " - " : ""}CNPJ ${data.branchCnpj}` : ""}
          </Text>
        )}
        <Text style={styles.title}>ATA E LISTA DE PRESENÇA DE TREINAMENTO</Text>
        <Text style={styles.subtitle}>
          Registro de capacitação nos termos da NR-1 (Portaria MTP nº 3.214/78) e da(s) Norma(s) Regulamentadora(s)
          aplicável(is) ao treinamento realizado
        </Text>
        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Treinamento</Text>
          <Text style={styles.infoValue}>{data.programName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Data de realização</Text>
          <Text style={styles.infoValue}>{formatDate(data.sessionDate)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Local</Text>
          <Text style={styles.infoValue}>{data.location ?? "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Instrutor/Responsável técnico</Text>
          <Text style={styles.infoValue}>{data.instructor ?? "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Periodicidade de reciclagem</Text>
          <Text style={styles.infoValue}>{data.periodicityLabel}</Text>
        </View>

        <Text style={styles.declaration}>
          Os participantes relacionados abaixo declaram ter comparecido e recebido, na data acima, o treinamento
          descrito, com conteúdo e orientações adequados à sua função, comprometendo-se a aplicar os conhecimentos e
          procedimentos transmitidos no exercício de suas atividades.
        </Text>

        <View style={styles.tableHeader}>
          <Text style={styles.colNum}>Nº</Text>
          <Text style={styles.colName}>Nome</Text>
          <Text style={styles.colPosition}>Cargo</Text>
          <Text style={styles.colBranch}>Filial</Text>
          <Text style={styles.colSignature}>Assinatura</Text>
        </View>
        {data.attendees.map((a, idx) => (
          <View style={styles.tableRow} key={idx} wrap={false}>
            <Text style={styles.colNum}>{idx + 1}</Text>
            <Text style={styles.colName}>{a.name}</Text>
            <Text style={styles.colPosition}>{a.positionTitle ?? "-"}</Text>
            <Text style={styles.colBranch}>{a.branchName}</Text>
            <Text style={styles.colSignature}></Text>
          </View>
        ))}

        <View style={styles.instructorBlock} wrap={false}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureCaption}>Assinatura do instrutor/responsável técnico</Text>
        </View>

        <Text style={styles.footer}>Documento gerado pelo sistema de RH da Sheila Morais em {generatedAt}.</Text>
      </Page>
    </Document>
  );
}
