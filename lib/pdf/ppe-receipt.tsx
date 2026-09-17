import "server-only";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export interface PpeReceiptData {
  employeeName: string;
  positionTitle: string | null;
  branchName: string;
  branchAddress: string | null;
  branchCnpj: string | null;
  item: string;
  caNumber: string;
  deliveryDate: string;
  expiryDate: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 42, fontSize: 10, fontFamily: "Helvetica", color: "#111827" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center" },
  branchLine: { fontSize: 9, textAlign: "center", color: "#4b5563", marginTop: 2 },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 18 },
  subtitle: { fontSize: 8.5, textAlign: "center", color: "#6b7280", marginTop: 3, marginBottom: 4 },
  divider: { borderBottom: "1pt solid #9ca3af", marginTop: 14, marginBottom: 10 },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  row: { flexDirection: "row", marginBottom: 5 },
  label: { width: 130, fontFamily: "Helvetica-Bold", color: "#374151" },
  value: { flex: 1 },
  declaration: { marginTop: 16, lineHeight: 1.55, textAlign: "justify", color: "#1f2937" },
  signatureBlock: { marginTop: 56 },
  signatureLine: { borderTop: "1pt solid #111827", width: "100%" },
  signatureCaption: { fontSize: 8.5, color: "#4b5563", marginTop: 4 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 42,
    right: 42,
    fontSize: 7.5,
    color: "#9ca3af",
    textAlign: "center",
  },
});

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

export function PpeReceiptDocument({ data }: { data: PpeReceiptData }) {
  const generatedAt = new Date().toLocaleString("pt-BR");

  return (
    <Document title={`Recibo de EPI - ${data.employeeName}`}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.companyName}>SHEILA MORAIS</Text>
        <Text style={styles.branchLine}>
          {data.branchName}
          {data.branchAddress ? ` - ${data.branchAddress}` : ""}
          {data.branchCnpj ? ` - CNPJ ${data.branchCnpj}` : ""}
        </Text>

        <Text style={styles.title}>RECIBO DE ENTREGA DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)</Text>
        <Text style={styles.subtitle}>Nos termos da Norma Regulamentadora nº 6 (NR-6) - Portaria MTP nº 3.214/78</Text>
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Dados do colaborador</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{data.employeeName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Cargo/Função</Text>
          <Text style={styles.value}>{data.positionTitle ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Filial</Text>
          <Text style={styles.value}>{data.branchName}</Text>
        </View>

        <Text style={styles.sectionTitle}>Dados do equipamento</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Descrição do EPI</Text>
          <Text style={styles.value}>{data.item}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Certificado de Aprovação (CA)</Text>
          <Text style={styles.value}>{data.caNumber}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data de entrega</Text>
          <Text style={styles.value}>{formatDate(data.deliveryDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Validade do equipamento</Text>
          <Text style={styles.value}>{data.expiryDate ? formatDate(data.expiryDate) : "Não aplicável"}</Text>
        </View>

        <Text style={styles.declaration}>
          Declaro, para os devidos fins, ter recebido nesta data o Equipamento de Proteção Individual (EPI) acima
          descrito, em perfeitas condições de uso, bem como orientação sobre sua forma correta de utilização, guarda e
          conservação. Comprometo-me a: (i) usar o EPI apenas para a finalidade a que se destina, durante toda a
          jornada de trabalho, quando exigido; (ii) responsabilizar-me por sua guarda e conservação; (iii) comunicar
          ao empregador qualquer alteração que o torne impróprio para uso; (iv) devolvê-lo ao empregador quando
          solicitado, quando substituído por novo equipamento, ou por ocasião do meu desligamento. Estou ciente de
          que o descumprimento das disposições acima constitui ato faltoso, nos termos do art. 158, parágrafo único,
          da Consolidação das Leis do Trabalho (CLT), e das disposições da Norma Regulamentadora nº 6 (NR-6) do
          Ministério do Trabalho e Emprego.
        </Text>

        <View style={styles.signatureBlock}>
          <View style={styles.signatureLine} />
          <Text style={styles.signatureCaption}>
            Assinatura do colaborador - {data.employeeName} - Data: ____/____/________
          </Text>
        </View>

        <Text style={styles.footer}>Documento gerado pelo sistema de RH da Sheila Morais em {generatedAt}.</Text>
      </Page>
    </Document>
  );
}
