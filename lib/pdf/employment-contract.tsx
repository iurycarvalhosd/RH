import "server-only";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ContractType } from "@/lib/types";

export interface EmploymentContractData {
  branchName: string;
  branchAddress: string | null;
  branchCnpj: string | null;
  employerRepName: string | null;

  employeeName: string;
  nationality: string;
  maritalStatusLabel: string | null;
  birthDate: string | null;
  cpf: string | null;
  rg: string | null;
  ctpsNumber: string | null;
  ctpsSeries: string | null;
  pisPasep: string | null;
  address: string | null;

  positionTitle: string | null;
  hireDate: string;
  contractType: ContractType;
  experienceEndDate: string | null;
  baseSalary: number | null;
  workSchedule: string | null;
}

const styles = StyleSheet.create({
  page: { padding: 44, fontSize: 9.5, fontFamily: "Helvetica", color: "#111827" },
  companyName: { fontSize: 13, fontFamily: "Helvetica-Bold", textAlign: "center" },
  branchLine: { fontSize: 9, textAlign: "center", color: "#4b5563", marginTop: 2 },
  title: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "center", marginTop: 16 },
  subtitle: { fontSize: 8.5, textAlign: "center", color: "#6b7280", marginTop: 3, marginBottom: 4 },
  divider: { borderBottom: "1pt solid #9ca3af", marginTop: 12, marginBottom: 10 },
  sectionTitle: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  row: { flexDirection: "row", marginBottom: 4 },
  label: { width: 140, fontFamily: "Helvetica-Bold", color: "#374151" },
  value: { flex: 1 },
  clause: { marginTop: 8, lineHeight: 1.5, textAlign: "justify", color: "#1f2937" },
  clauseTitle: { fontFamily: "Helvetica-Bold" },
  signatureRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 60 },
  signatureBlock: { width: "45%" },
  signatureLine: { borderTop: "1pt solid #111827", width: "100%" },
  signatureCaption: { fontSize: 8.5, color: "#4b5563", marginTop: 4, textAlign: "center" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 44,
    right: 44,
    fontSize: 7.5,
    color: "#9ca3af",
    textAlign: "center",
  },
});

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso + "T00:00:00").toLocaleDateString("pt-BR");
}

function money(n: number | null): string {
  if (n == null) return "-";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function EmploymentContractDocument({ data }: { data: EmploymentContractData }) {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const isExperience = data.contractType === "experiencia";

  return (
    <Document title={`Contrato de trabalho - ${data.employeeName}`}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.companyName}>SHEILA MORAIS</Text>
        <Text style={styles.branchLine}>
          {data.branchName}
          {data.branchAddress ? ` - ${data.branchAddress}` : ""}
          {data.branchCnpj ? ` - CNPJ ${data.branchCnpj}` : ""}
        </Text>

        <Text style={styles.title}>
          {isExperience ? "CONTRATO DE TRABALHO POR PRAZO DETERMINADO" : "CONTRATO INDIVIDUAL DE TRABALHO"}
          {isExperience ? " (CONTRATO DE EXPERIÊNCIA)" : ""}
        </Text>
        <Text style={styles.subtitle}>
          Nos termos da Consolidação das Leis do Trabalho (CLT - Decreto-Lei nº 5.452/1943), artigos 442 a 445
        </Text>
        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Empregador</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Razão social</Text>
          <Text style={styles.value}>Sheila Morais - {data.branchName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>CNPJ</Text>
          <Text style={styles.value}>{data.branchCnpj ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Endereço</Text>
          <Text style={styles.value}>{data.branchAddress ?? "-"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Empregado(a)</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Nome</Text>
          <Text style={styles.value}>{data.employeeName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Nacionalidade</Text>
          <Text style={styles.value}>{data.nationality}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Estado civil</Text>
          <Text style={styles.value}>{data.maritalStatusLabel ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Data de nascimento</Text>
          <Text style={styles.value}>{formatDate(data.birthDate)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>CPF</Text>
          <Text style={styles.value}>{data.cpf ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>RG</Text>
          <Text style={styles.value}>{data.rg ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>CTPS (nº/série)</Text>
          <Text style={styles.value}>
            {data.ctpsNumber ?? "-"} / {data.ctpsSeries ?? "-"}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>PIS/PASEP</Text>
          <Text style={styles.value}>{data.pisPasep ?? "-"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Endereço</Text>
          <Text style={styles.value}>{data.address ?? "-"}</Text>
        </View>

        <Text style={styles.sectionTitle}>Condições contratuais</Text>

        <Text style={styles.clause}>
          <Text style={styles.clauseTitle}>Cláusula 1ª - Função e admissão. </Text>
          O(A) empregado(a) é admitido(a) para exercer a função de <Text style={styles.clauseTitle}>{data.positionTitle ?? "-"}</Text>,
          a partir de {formatDate(data.hireDate)}, comprometendo-se a executar suas atividades com zelo, assiduidade
          e observância das normas internas do empregador.
        </Text>

        {isExperience ? (
          <Text style={styles.clause}>
            <Text style={styles.clauseTitle}>Cláusula 2ª - Prazo. </Text>
            O presente contrato é celebrado por prazo determinado, a título de experiência, com vigência de{" "}
            {formatDate(data.hireDate)} até {formatDate(data.experienceEndDate)}, não podendo, somadas eventuais
            prorrogações, exceder o limite de 90 (noventa) dias previsto no art. 445, parágrafo único, da CLT. Findo o
            prazo sem manifestação em contrário, o contrato poderá ser prorrogado dentro do limite legal ou, caso
            ultrapasse tal prazo, converter-se automaticamente em contrato por prazo indeterminado.
          </Text>
        ) : (
          <Text style={styles.clause}>
            <Text style={styles.clauseTitle}>Cláusula 2ª - Prazo. </Text>
            O presente contrato é celebrado por prazo indeterminado, nos termos do art. 443 da CLT, podendo ser
            rescindido por qualquer das partes na forma prevista em lei.
          </Text>
        )}

        <Text style={styles.clause}>
          <Text style={styles.clauseTitle}>Cláusula 3ª - Remuneração. </Text>
          Pela prestação dos serviços, o(a) empregado(a) receberá remuneração mensal de {money(data.baseSalary)},
          paga até o 5º (quinto) dia útil do mês subsequente ao vencido, mediante crédito em conta ou outra forma
          convencionada entre as partes, observadas as retenções e recolhimentos legais.
        </Text>

        <Text style={styles.clause}>
          <Text style={styles.clauseTitle}>Cláusula 4ª - Jornada de trabalho. </Text>
          {data.workSchedule ??
            "A jornada de trabalho será definida conforme escala fornecida pelo empregador, respeitados os limites legais."}
        </Text>

        <Text style={styles.clause}>
          <Text style={styles.clauseTitle}>Cláusula 5ª - Local de trabalho. </Text>
          Os serviços serão prestados no estabelecimento do empregador localizado em {data.branchAddress ?? data.branchName},
          podendo haver alteração de local mediante prévio acordo entre as partes, observadas as disposições da CLT.
        </Text>

        <Text style={styles.clause}>
          <Text style={styles.clauseTitle}>Cláusula 6ª - Disposições gerais. </Text>
          As partes se comprometem a observar as demais disposições da Consolidação das Leis do Trabalho, do
          regulamento interno da empresa e da legislação previdenciária e de segurança e saúde no trabalho aplicável
          à atividade exercida. Por estarem de acordo, as partes assinam o presente instrumento em 2 (duas) vias de
          igual teor.
        </Text>

        <View style={styles.signatureRow} wrap={false}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureCaption}>{data.employeeName}{"\n"}Empregado(a) - Data: ____/____/________</Text>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureCaption}>
              {data.employerRepName ?? "Representante legal"}
              {"\n"}Sheila Morais ({data.branchName}) - Data: ____/____/________
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>Documento gerado pelo sistema de RH da Sheila Morais em {generatedAt}.</Text>
      </Page>
    </Document>
  );
}
