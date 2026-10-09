// ==============================================================================
// DOCUMENTS/TICKET-REPORT.TYP — RELATÓRIO DE CHAMADOS EM TYPST
// Importa template.typ para o design genérico e report.typ para o formato tabular.
// ==============================================================================

#import "../template.typ": *
#import "../report.typ": *

// Entrada dinâmica via sys.inputs (ou dados padrão para pré-visualização)
#let raw-data = sys.inputs.at("data", default: "{}")
#let input-data = if raw-data != "{}" { json(bytes(raw-data)) } else { (:) }

#let title = input-data.at("title", default: "Relatório de Chamados de Suporte")
#let subtitle = input-data.at("subtitle", default: "Todos os chamados registrados no período · Sistema Acerola Ticket")
#let metrics = input-data.at("metrics", default: (
  (label: "Total", value: "24"),
  (label: "Abertos", value: "6"),
  (label: "Em Andamento", value: "8"),
  (label: "Resolvidos", value: "10"),
))

#let headers = input-data.at("headers", default: ("Protocolo", "Solicitante", "Área", "Situação", "Prioridade", "Abertura"))
#let rows = input-data.at("rows", default: (
  (
    text(weight: "bold", "CH-0001"),
    "Ana Paula Silva",
    "Infra",
    badge("EM ATENDIMENTO", tone: "info", size: 7.5pt),
    badge("ALTA", tone: "danger", size: 7.5pt),
    "25/09/2026 09:15",
  ),
  (
    text(weight: "bold", "CH-0002"),
    "Bruno Carvalho",
    "Sistema",
    badge("ABERTO", tone: "warning", size: 7.5pt),
    badge("MÉDIA", tone: "neutral", size: 7.5pt),
    "25/09/2026 10:20",
  ),
  (
    text(weight: "bold", "CH-0003"),
    "Carla Dias",
    "Infra",
    badge("RESOLVIDO", tone: "success", size: 7.5pt),
    badge("BAIXA", tone: "neutral", size: 7.5pt),
    "24/09/2026 14:00",
  ),
  (
    text(weight: "bold", "CH-0004"),
    "Diego Martins",
    "Sistema",
    badge("RESOLVIDO", tone: "success", size: 7.5pt),
    badge("CRÍTICA", tone: "danger", size: 7.5pt),
    "23/09/2026 16:45",
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
    note: "Relatório gerencial confidencial",
    doc-ref: "REL-CHAMADOS-2026",
  ),
)

#report-header(
  title: title,
  subtitle: subtitle,
  metrics: metrics,
)

#report-data-table(
  columns: (1.2fr, 2.2fr, 1.2fr, 1.8fr, 1.4fr, 1.8fr),
  headers: headers,
  rows: rows,
  align-cells: (left, left, left, center, center, left),
)
