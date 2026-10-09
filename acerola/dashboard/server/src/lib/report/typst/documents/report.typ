// ==============================================================================
// DOCUMENTS/REPORT.TYP — RELATÓRIO TABULAR GENÉRICO EM TYPST
// Importa template.typ para o design genérico e report.typ para formatações.
// Suporta tabelas de chamados, inventário de máquinas e listas operacionais.
// ==============================================================================

#import "../template.typ": *
#import "../report.typ": *

// Entrada dinâmica via sys.inputs
#let raw-data = sys.inputs.at("data", default: "{}")
#let data-file = sys.inputs.at("data_file", default: none)
#let input-data = if data-file != none {
  json(data-file)
} else if raw-data != "{}" {
  json(bytes(raw-data))
} else {
  (:)
}

#let title = input-data.at("title", default: "Relatório Gerencial")
#let subtitle = input-data.at("subtitle", default: none)
#let metrics = input-data.at("metrics", default: ())
#let headers = input-data.at("headers", default: ("Coluna 1", "Coluna 2"))
#let raw-rows = input-data.at("rows", default: ())
#let note = input-data.at("note", default: "Documento gerado eletronicamente")
#let doc-ref = input-data.at("docRef", default: "")

#let render-cell(cell) = {
  if type(cell) == dictionary {
    let t = cell.at("text", default: "")
    let tone = cell.at("tone", default: none)
    let is-bold = cell.at("bold", default: false)
    if tone != none {
      badge(t, tone: tone, size: 7.5pt)
    } else if is-bold {
      text(weight: "bold", size: 8.5pt, t)
    } else {
      text(size: 8.5pt, t)
    }
  } else {
    text(size: 8.5pt, str(cell))
  }
}

#let processed-rows = raw-rows.map(row => row.map(render-cell))

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
    note: note,
    doc-ref: doc-ref,
  ),
)

#report-header(
  title: title,
  subtitle: subtitle,
  metrics: metrics,
)

#let col-count = calc.max(headers.len(), 1)
#let col-widths = (1fr,) * col-count

#report-data-table(
  columns: col-widths,
  headers: headers,
  rows: processed-rows,
)
