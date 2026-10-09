// ==============================================================================
// DECLARATION.TYP — FORMATAÇÃO ESPECÍFICA DE DECLARAÇÕES FISCAIS / CONTÁBEIS
// Baseado com 100% de fidelidade no modelo corporativo da Azuos Assessoria Contábil.
// ==============================================================================

#import "template.typ": *

// Título da Declaração (sz="30" / 15pt negrito, centralizado)
#let declaration-title(title) = {
  v(8pt)
  align(center)[
    #text(fill: text-primary, size: 14.5pt, weight: "bold", upper(title))
  ]
  v(12pt)
}

// Preâmbulo da Declaração (sz="24" / 11.5pt, justificado com recuo de parágrafo)
#let declaration-preamble(company-name, cnpj, address, purpose-text) = {
  set par(justify: true, first-line-indent: 1.5cm, leading: 0.8em)
  [
    #purpose-text que a empresa *#company-name*, inscrita no CNPJ *#cnpj*, estabelecida à #address, teve a movimentação conforme discriminado no quadro abaixo:
  ]
  v(12pt)
}

// Tabela de Faturamento / Dados Fiscais (sz="24" / 10.5pt-11pt)
#let declaration-table(headers, rows, total-row: none) = {
  let all-rows = rows
  if total-row != none {
    all-rows.push(total-row.map(cell => text(weight: "bold", cell)))
  }

  align(center)[
    #styled-table(
      columns: (1.5fr, 1fr, 2fr),
      headers: headers,
      rows: all-rows,
      align-cells: (center, center, right),
      zebra: true,
      table-style: "navy",
      font-size: 10.5pt,
    )
  ]
  v(12pt)
}

// Fechamento e Datação
#let declaration-closing(city-state: "Goiânia/GO", date-str: "") = {
  set par(justify: true, first-line-indent: 1.5cm, leading: 0.8em)
  [
    Por ser a expressão da verdade firmamos o presente para todos e quaisquer efeitos legais.
  ]
  v(14pt)
  align(right)[
    #text(fill: text-primary, size: 10.5pt)[#city-state, #date-str.]
  ]
  v(18pt)
}

// Bloco de Assinaturas Contábeis
#let declaration-signatures(signers) = {
  signature-block(signers)
}
