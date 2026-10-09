// ==============================================================================
// DOCUMENTS/COMPUTER-REPORT.TYP — RELATÓRIO DE COMPUTADORES EM TYPST
// Importa template.typ para o design genérico e report.typ para o formato tabular.
// ==============================================================================

#import "../template.typ": *
#import "../report.typ": *

// Entrada dinâmica via sys.inputs (ou dados padrão para pré-visualização)
#let raw-data = sys.inputs.at("data", default: "{}")
#let input-data = if raw-data != "{}" { json(bytes(raw-data)) } else { (:) }

#let title = input-data.at("title", default: "Inventário de Computadores")
#let subtitle = input-data.at("subtitle", default: "Parque tecnológico e saúde de máquinas · Sistema Acerola Ticket")
#let metrics = input-data.at("metrics", default: (
  (label: "Máquinas", value: "32"),
  (label: "Operacionais", value: "29"),
  (label: "Atenção", value: "2"),
  (label: "Críticas", value: "1"),
))

#let headers = input-data.at("headers", default: ("Patrimônio", "Host", "Setor", "Usuário", "Saúde", "RAM / Disco", "Último Contato"))
#let rows = input-data.at("rows", default: (
  (
    text(weight: "bold", "PAT-0012"),
    "FIN-DESK-01",
    "Financeiro",
    "Juliana Lima",
    badge("SAUDÁVEL", tone: "success", size: 7.5pt),
    "16 GB · 512 GB SSD",
    "Hoje, 10:45",
  ),
  (
    text(weight: "bold", "PAT-0015"),
    "REC-NOTE-02",
    "Recepção",
    "Lucas Mendes",
    badge("ATENÇÃO", tone: "warning", size: 7.5pt),
    "8 GB · 256 GB SSD",
    "Ontem, 18:20",
  ),
  (
    text(weight: "bold", "PAT-0021"),
    "FIS-DESK-03",
    "Fiscal",
    "Marcos Vinicius",
    badge("CRÍTICO", tone: "danger", size: 7.5pt),
    "8 GB · 500 GB HD",
    "22/09/2026",
  ),
))

#show: template-doc.with(
  title: title,
  subtitle: subtitle,
  paper: "a4",
  orientation: "landscape",
  margin: (top: 2.2cm, bottom: 2.0cm, left: 1.8cm, right: 1.8cm),
  show-brand: true,
  brand-path: "/brand.png",
  brand-mode: "compact",
  footer-mode: "corporate",
  footer-data: (
    note: "Inventário de ativos de tecnologia da informação",
    doc-ref: "INV-COMP-2026",
  ),
)

#report-header(
  title: title,
  subtitle: subtitle,
  metrics: metrics,
)

#report-data-table(
  columns: (1.2fr, 1.8fr, 1.4fr, 1.8fr, 1.3fr, 2.0fr, 1.6fr),
  headers: headers,
  rows: rows,
  align-cells: (left, left, left, left, center, left, left),
)
