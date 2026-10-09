// ==============================================================================
// SERVICE-ORDER.TYP — FORMATAÇÃO ESPECÍFICA DE ORDEM DE SERVIÇO
// Importa template.typ para as primitivas visuais e define a estrutura da O.S.
// ==============================================================================

#import "template.typ": *

// Barra de Status e Sub-cabeçalho da Ordem de Serviço
#let so-header(
  protocol: none,
  status: "Em Atendimento",
  status-tone: "info",
  priority: "Média",
  priority-tone: "neutral",
  area: "Infraestrutura",
  department: "Geral",
) = {
  grid(
    columns: (1fr, auto),
    gutter: 10pt,
    align: (left + horizon, right + horizon),
    [
      #text(fill: text-secondary, size: 9pt)[Área: #strong(area) · Departamento: #strong(department)]
    ],
    [
      #badge(upper(priority), tone: priority-tone, size: 8pt)
      #h(4pt)
      #badge(upper(status), tone: status-tone, size: 8.5pt)
    ]
  )
  v(4pt)
}

// Ficha de Dados do Solicitante e Equipamento
#let so-details-grid(
  fields: none,
  requester-name: "—",
  contact-phone: none,
  anydesk-id: none,
  computer-name: none,
  computer-model: none,
  created-at: "—",
) = {
  let pairs = if fields != none {
    fields
  } else {
    (
      ("Solicitante:", requester-name),
      ("Abertura:", created-at),
      ("Telefone / WhatsApp:", if contact-phone != none { contact-phone } else { "—" }),
      ("AnyDesk:", if anydesk-id != none { anydesk-id } else { "—" }),
      ("Computador / Host:", if computer-name != none { computer-name } else { "Não associado" }),
      ("Modelo / Hardware:", if computer-model != none { computer-model } else { "—" }),
    )
  }
  card(
    title: "Dados do chamado",
    kv-grid(pairs, columns: 2)
  )
}

// Descrição do Chamado
#let so-description-block(description, problem-label: none) = {
  if description != none and description != "" {
    v(6pt)
    card(
      title: if problem-label != none and problem-label != "" { "Descrição do problema (" + problem-label + ")" } else { "Descrição do problema" },
      [
        #set text(fill: text-primary, size: 9.5pt)
        #description
      ]
    )
  }
}

// Parecer Técnico / Solução Final
#let so-solution-block(solution, resolved-at: none, technician: none) = {
  if solution != none and solution != "" {
    v(6pt)
    card(
      title: "O que foi feito",
      tone: "success",
      [
        #set text(fill: text-primary, size: 9.5pt)
        #solution
        #if resolved-at != none or technician != none [
          #v(4pt)
          #text(fill: text-muted, size: 8pt)[
            #if technician != none [Concluído por: *#technician* ]
            #if resolved-at != none [ · Data de Conclusão: *#resolved-at*]
          ]
        ]
      ]
    )
  }
}

// Linha do Tempo / Histórico da Ordem de Serviço
#let so-timeline(events) = {
  section-heading("Histórico")
  
  if events.len() == 0 {
    v(2pt)
    align(left)[
      #text(fill: text-muted, size: 9pt, style: "italic")[Nenhum histórico registrado.]
    ]
  } else {
    for ev in events {
      let t-tone = ev.at("tone", default: "neutral")
      let date-str = ev.at("date", default: "")
      let author-str = ev.at("author", default: "Técnico")
      let type-str = ev.at("type", default: "Nota")
      let minutes = ev.at("minutes", default: none)
      let desc = ev.at("description", default: "")
      let details = ev.at("details", default: none)
      let attachments = ev.at("attachments", default: none)

      rect(
        width: 100%,
        stroke: (left: 3pt + tone-colors.at(t-tone, default: tone-colors.neutral).solid, rest: 0.5pt + border-dark),
        fill: bg-zebra,
        radius: (right: 3pt),
        inset: 8pt,
        [
          #grid(
            columns: (1fr, auto),
            align: (left + horizon, right + horizon),
            [
              #badge(type-str, tone: t-tone, size: 8pt)
              #h(6pt)
              #text(fill: text-secondary, size: 8.5pt, weight: "bold", author-str)
              #h(6pt)
              #text(fill: text-muted, size: 8pt, date-str)
            ],
            if minutes != none and minutes > 0 [
              #text(fill: text-muted, size: 8pt)[⏱ #minutes min]
            ]
          )
          #if details != none and details != "" [
            #v(2pt)
            #text(fill: text-muted, size: 8pt, details)
          ]
          #if desc != "" [
            #v(4pt)
            #text(fill: text-primary, size: 9pt, desc)
          ]
          #if attachments != none and attachments != "" [
            #v(2pt)
            #text(fill: text-muted, size: 8pt, style: "italic")[Anexos: #attachments]
          ]
        ]
      )
      v(4pt)
    }
  }
}

// Termo de Encerramento e Assinaturas
#let so-closure-block(technician-name: "Técnico Responsável", requester-name: "Solicitante / Cliente") = {
  v(8pt)
  text(fill: text-muted, size: 8pt)[
    Atesto que o atendimento descrito nesta Ordem de Serviço foi realizado de acordo com as especificações técnicas, com os testes funcionais validados em conjunto com o solicitante.
  ]
  signature-block((
    (technician-name, "Responsável Técnico TI", "Data: ____/____/________"),
    (requester-name, "Ciente / Solicitante", "Data: ____/____/________"),
  ))
}
