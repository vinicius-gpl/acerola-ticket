// ==============================================================================
// REPORT.TYP — FORMATAÇÃO ESPECÍFICA DE RELATÓRIOS
// Formata relatórios tabulares, fichas de inventário e listas gerenciais.
// ==============================================================================

#import "template.typ": *

// Cabeçalho de Relatório
#let report-header(
  title: "Relatório Gerencial",
  subtitle: none,
  metrics: (),
) = {
  grid(
    columns: (1fr, auto),
    gutter: 12pt,
    align: (left + horizon, right + horizon),
    [
      #text(fill: brand-primary, size: 14pt, weight: "bold", title)
      #if subtitle != none [ \ #text(fill: text-muted, size: 8.5pt, subtitle) ]
    ],
    if metrics.len() > 0 [
      #grid(
        columns: (auto,) * metrics.len(),
        gutter: 6pt,
        ..metrics.map(m => [
          #rect(
            fill: bg-zebra,
            stroke: 0.5pt + border-color,
            radius: 3pt,
            inset: (x: 6pt, y: 4pt),
            align(center)[
              #text(fill: text-muted, size: 7pt, upper(m.at("label"))) \
              #text(fill: brand-primary, size: 10pt, weight: "bold", str(m.at("value")))
            ]
          )
        ])
      )
    ]
  )
  v(4pt)
  line(length: 100%, stroke: 1.5pt + brand-primary)
  v(6pt)
}

// Tabela de Dados de Relatório
#let report-data-table(
  columns: (),
  headers: (),
  rows: (),
  align-cells: (left,),
) = {
  styled-table(
    columns: columns,
    headers: headers,
    rows: rows,
    align-cells: align-cells,
    zebra: true,
  )
}

// Ficha de Registro Único (para modo formulário/cards)
#let report-record-card(
  title: "Registro",
  status-badge: none,
  fields: (),
) = {
  card(
    title: none,
    [
      #grid(
        columns: (1fr, auto),
        align: (left + horizon, right + horizon),
        text(fill: brand-primary, size: 10pt, weight: "bold", title),
        if status-badge != none { status-badge } else { none }
      )
      #divider()
      #kv-grid(fields, columns: 2)
    ]
  )
  v(6pt)
}
