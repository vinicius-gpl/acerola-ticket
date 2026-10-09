// ==============================================================================
// CONTRACT.TYP — FORMATAÇÃO ESPECÍFICA DE CONTRATOS SOCIAIS E TERMOS JURÍDICOS
// Baseado com 100% de fidelidade no modelo societário WCG Comércio de Peças / Azuos.
// ==============================================================================

#import "template.typ": *

// Título do Contrato Social (sz="26" e sz="30" / 13pt-15pt negrito, centralizado)
#let contract-title(company-name, subtitle: "Contrato Social") = {
  v(8pt)
  align(center)[
    #text(fill: text-primary, size: 14pt, weight: "bold", upper(company-name)) \
    #v(3pt)
    #text(fill: brand-primary, size: 12pt, weight: "bold", upper(subtitle))
  ]
  v(12pt)
}

// Qualificação das Partes / Preâmbulo
#let contract-preamble(partners, intro-text) = {
  set par(justify: true, first-line-indent: 1.5cm, leading: 0.8em)
  for partner in partners {
    [
      *#upper(partner.at("name"))*, #partner.at("qualification"). \
    ]
  }
  v(6pt)
  [
    #intro-text
  ]
  v(10pt)
}

// Cláusula do Contrato (sz="24" / 11pt-12pt)
#let contract-clause(section-title, clause-name, clause-body, paragraphs: ()) = {
  clause-heading(section-title)
  set par(justify: true, first-line-indent: 1.5cm, leading: 0.8em)
  [
    *#clause-name.* #clause-body
  ]
  for p in paragraphs {
    v(4pt)
    [
      #if p.starts-with("Parágrafo") [
        *#p.slice(0, p.position(".")).* #p.slice(p.position(".") + 1)
      ] else [
        #p
      ]
    ]
  }
  v(8pt)
}

// Tabela de Capital Social e Quotas (tabela da Web / borda corporativa da amostra WCG)
#let contract-capital-table(headers, rows, total-row: none) = {
  let all-rows = rows
  if total-row != none {
    all-rows.push(total-row.map(cell => text(weight: "bold", cell)))
  }

  align(center)[
    #styled-table(
      columns: (2.5fr, 1.2fr, 1.2fr, 1fr, 1.8fr),
      headers: headers,
      rows: all-rows,
      align-cells: (left, right, right, center, right),
      zebra: true,
      table-style: "bordered",
      font-size: 10pt,
    )
  ]
  v(10pt)
}

// Fechamento Jurídico e Foro
#let contract-closing(city-state: "Goiânia/GO", date-str: "", signers: ()) = {
  set par(justify: true, first-line-indent: 1.5cm, leading: 0.8em)
  [
    E por estarem assim justos e contratados, declaram que todas as cláusulas constantes deste contrato se acham em perfeito acordo e obrigam-se a cumpri-lo fielmente.
  ]
  v(14pt)
  align(right)[
    #text(fill: text-primary, size: 10.5pt)[#city-state, #date-str.]
  ]
  v(18pt)
  signature-block(signers)
}
