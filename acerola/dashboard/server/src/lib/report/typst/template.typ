// ==============================================================================
// TEMPLATE.TYP — IDENTIDADE VISUAL E FUNÇÕES GENÉRICAS
// 100% visual, 100% funções genéricas reutilizáveis entre sistemas.
// Baseado com fidelidade nos padrões visuais da Azuos e WCG.
// ==============================================================================

// --- Paleta de Cores Corporativa (Azuos & Design System) ---
#let brand-primary = rgb("#0A3D62")      // Azul marinho corporativo (Azuos)
#let brand-secondary = rgb("#16325C")    // Azul marinho intermediário
#let brand-accent = rgb("#FFD100")       // Amarelo marca
#let brand-dark = rgb("#051E33")         // Azul profundo
#let brand-light = rgb("#EAF2F8")        // Fundo azul suave
#let text-primary = rgb("#1F2937")       // Grafite escuro para leitura (amostra #272235/#000000)
#let text-secondary = rgb("#4B5563")     // Texto secundário
#let text-muted = rgb("#6B7280")         // Texto atenuado/legendas
#let text-light = rgb("#9CA3AF")         // Texto claro
#let border-color = rgb("#E2E8F0")       // Linhas e bordas suaves (slate-200)
#let border-dark = rgb("#CBD5E1")        // Bordas estruturais (slate-300 / 0.5pt Word)
#let bg-zebra = rgb("#F8FAFC")           // Zebrado suave de tabelas (slate-50)
#let bg-card = rgb("#FFFFFF")            // Fundo de cartões
#let bg-muted = rgb("#F1F5F9")           // Fundo cinza suave

// Tons de Status (Alinhados com StatusBadge e Catppuccin)
#let tone-colors = (
  neutral: (fill: rgb("#F1F5F9"), text: rgb("#334155"), solid: rgb("#64748B"), border: rgb("#CBD5E1")),
  info:    (fill: rgb("#DBEAFE"), text: rgb("#1D4ED8"), solid: rgb("#2563EB"), border: rgb("#BFDBFE")),
  success: (fill: rgb("#D1FAE5"), text: rgb("#047857"), solid: rgb("#059669"), border: rgb("#A7F3D0")),
  warning: (fill: rgb("#FEF3C7"), text: rgb("#92400E"), solid: rgb("#D97706"), border: rgb("#FDE68A")),
  danger:  (fill: rgb("#FEE2E2"), text: rgb("#B91C1C"), solid: rgb("#DC2626"), border: rgb("#FECACA")),
  brand:   (fill: rgb("#E0E7FF"), text: rgb("#0A3D62"), solid: rgb("#0A3D62"), border: rgb("#C7D2FE")),
)

// --- Tipografia Padrão ---
#let default-font-family = ("Liberation Sans", "Arial")
#let default-font-stretch = 75% // Mapeia exatamente para Liberation Sans Narrow / Arial Narrow

// --- Funções de Badge / Etiqueta ---
#let badge(label, tone: "neutral", size: 8pt) = {
  let colors = tone-colors.at(tone, default: tone-colors.neutral)
  box(
    fill: colors.fill,
    stroke: 0.5pt + colors.border,
    radius: 3pt,
    inset: (x: 5pt, y: 2.5pt),
    outset: 0pt,
    baseline: 0%,
    [
      #text(
        fill: colors.text,
        size: size,
        weight: "bold",
        tracking: 0.2pt,
        label
      )
    ]
  )
}

// --- Funções de Divisor e Cabeçalho de Seção ---
#let divider(stroke-color: border-color) = {
  v(4pt)
  line(length: 100%, stroke: 0.5pt + stroke-color)
  v(4pt)
}

#let section-heading(title, icon: none, action: none) = {
  v(8pt)
  grid(
    columns: (1fr, auto),
    align: (left + horizon, right + horizon),
    [
      #if icon != none [ #text(fill: brand-primary, icon) #h(4pt) ]
      #text(fill: brand-primary, size: 11pt, weight: "bold", upper(title))
    ],
    if action != none [ #action ]
  )
  v(2pt)
  line(length: 100%, stroke: 1.5pt + brand-primary)
  v(4pt)
}

#let clause-heading(title) = {
  v(10pt)
  align(center)[
    #text(fill: text-primary, size: 11.5pt, weight: "bold", upper(title))
  ]
  v(4pt)
}

// --- Funções de Bloco e Cartão ---
#let card(body, title: none, tone: none, fill: bg-card, stroke: border-dark) = {
  let card-stroke = 0.5pt + stroke
  let card-fill = fill
  if tone != none {
    let t = tone-colors.at(tone, default: tone-colors.neutral)
    card-fill = t.fill
    card-stroke = 0.5pt + t.border
  }
  
  rect(
    width: 100%,
    fill: card-fill,
    stroke: card-stroke,
    radius: 4pt,
    inset: 9pt,
    [
      #if title != none [
        #block(below: 6pt)[
          #text(fill: brand-primary, size: 9.5pt, weight: "bold", upper(title))
        ]
      ]
      #body
    ]
  )
}

// --- Chave / Valor ---
#let kv-row(label, value, label-width: 32%) = {
  grid(
    columns: (label-width, 1fr),
    align: (left + top, left + top),
    text(fill: text-muted, size: 9pt, weight: "bold", label),
    text(fill: text-primary, size: 9pt, value)
  )
}

#let kv-grid(pairs, columns: 2) = {
  grid(
    columns: (1fr,) * columns,
    column-gutter: 14pt,
    row-gutter: 6pt,
    ..pairs.map(p => kv-row(p.at(0), p.at(1), label-width: 38%))
  )
}

// --- Tabela Estilizada (Padronizada com as amostras de Word e Excel) ---
#let styled-table(
  columns: (),
  headers: (),
  rows: (),
  align-cells: (left,),
  zebra: true,
  table-style: "navy", // "navy", "slate", "clean", "bordered"
  font-size: 9.5pt,
) = {
  let align-func = (col, row) => {
    if col < align-cells.len() {
      align-cells.at(col)
    } else {
      left
    }
  }

  let header-bg = if table-style == "slate" {
    bg-muted
  } else if table-style == "clean" {
    white
  } else {
    brand-primary
  }

  let header-fg = if table-style == "slate" {
    brand-primary
  } else if table-style == "clean" {
    text-primary
  } else {
    white
  }

  table(
    columns: columns,
    table.header(
      ..headers.map(h => text(fill: header-fg, size: font-size, weight: "bold", h))
    ),
    stroke: (x, y) => if y == 0 {
      (bottom: 1.5pt + brand-dark)
    } else if table-style == "bordered" {
      0.5pt + border-dark
    } else {
      (bottom: 0.5pt + border-color)
    },
    fill: (col, row) => {
      if row == 0 {
        header-bg
      } else if zebra and calc.even(row) {
        bg-zebra
      } else {
        white
      }
    },
    align: align-func,
    inset: (x: 8pt, y: 6pt),
    ..rows.flatten()
  )
}

// --- Assinaturas ---
#let signature-block(lines) = {
  v(16pt)
  let cols = (1fr,) * calc.min(lines.len(), 2)
  grid(
    columns: cols,
    column-gutter: 28pt,
    row-gutter: 20pt,
    ..lines.map(line-data => [
      #align(center)[
        #line(length: 85%, stroke: 0.75pt + text-secondary)
        #v(4pt)
        #text(fill: text-primary, size: 9.5pt, weight: "bold", line-data.at(0)) \
        #if line-data.len() > 1 [
          #text(fill: text-muted, size: 8.5pt, line-data.at(1)) \
        ]
        #if line-data.len() > 2 [
          #text(fill: text-muted, size: 8pt, line-data.at(2)) \
        ]
      ]
    ])
  )
}

// --- Componentes do Header ---
// Padrão visual que carrega brand.png com dimensões proporcionais e legíveis
#let render-header(
  show-brand: true,
  brand-path: "/brand.png",
  brand-mode: "logo", // "logo" (centralizado 5.2cm), "compact" (lado a lado 42pt), "letterhead", "none"
  brand-width: 5.2cm,
  title: none,
  subtitle: none,
) = {
  if not show-brand or brand-mode == "none" or brand-path == none {
    if title != none {
      grid(
        columns: (1fr, auto),
        align: (left + horizon, right + horizon),
        [
          #text(fill: brand-primary, size: 14pt, weight: "bold", title)
          #if subtitle != none [ \ #text(fill: text-muted, size: 9pt, subtitle) ]
        ],
        none
      )
      v(4pt)
      line(length: 100%, stroke: 0.5pt + border-dark)
      v(6pt)
    }
  } else if brand-mode == "letterhead" {
    // Modo timbrado completo (baseado em AZUOS ASSESSORIA CONTABIL)
    align(center)[
      #image(brand-path, width: 6.5cm)
    ]
    v(10pt)
  } else if brand-mode == "compact" {
    // Modo compacto lado a lado: logo nítido e proeminente (altura 42pt)
    grid(
      columns: (auto, 1fr),
      gutter: 16pt,
      align: (left + horizon, right + horizon),
      image(brand-path, height: 42pt),
      align(right)[
        #if title != none [ #text(fill: brand-primary, size: 12pt, weight: "bold", title) ]
        #if subtitle != none [ \ #text(fill: text-muted, size: 8.5pt, subtitle) ]
      ]
    )
    v(4pt)
    line(length: 100%, stroke: 1.5pt + brand-primary)
    v(6pt)
  } else {
    // Modo padrão "logo": logo centralizado proporcional (5.2cm de largura — padrão WCG)
    align(center)[
      #image(brand-path, width: brand-width)
    ]
    if title != none {
      v(6pt)
      align(center)[
        #text(fill: brand-primary, size: 13pt, weight: "bold", upper(title))
        #if subtitle != none [ \ #text(fill: text-muted, size: 9pt, subtitle) ]
      ]
    }
    v(10pt)
  }
}

// Running header para páginas 2+ em documentos multipáginas
#let render-running-header(title: none, brand-path: none) = {
  grid(
    columns: (auto, 1fr, auto),
    gutter: 8pt,
    align: (left + horizon, left + horizon, right + horizon),
    if brand-path != none {
      image(brand-path, height: 16pt)
    } else {
      none
    },
    if title != none {
      text(fill: text-muted, size: 8pt, weight: "bold", title)
    } else {
      none
    },
    text(fill: text-muted, size: 8pt)[
      Página #context counter(page).display("1 de 1", both: true)
    ]
  )
  v(2pt)
  line(length: 100%, stroke: 0.5pt + border-dark)
}

// --- Componentes do Footer com Variações Flexíveis ---
#let render-footer(
  mode: "corporate",
  data: (:),
) = {
  if mode == "qrcode" {
    // Variação 1: QR Code de Conferência Digital (padrão Acerola Ticket)
    let qr-img = data.at("qr-image", default: none)
    let qr-svg = data.at("qr-svg", default: none)
    let verify-url = data.at("verify-url", default: "https://acerola.azuos.com.br/verify")
    let verify-display = data.at("verify-display", default: verify-url)
    let doc-code = data.at("code", default: "CH-0000")
    let issued-by = data.at("issued-by", default: "Sistema")
    let issued-at = data.at("issued-at", default: "")
    let protocol = data.at("protocol", default: none)
    let version = data.at("version", default: none)

    block(width: 100%)[
      #line(length: 100%, stroke: 0.5pt + border-dark)
      #v(4pt)
      #grid(
        columns: (if qr-svg != none or qr-img != none { 42pt } else { 0pt }, 1fr, auto),
        column-gutter: 10pt,
        align: (left + horizon, left + horizon, right + horizon),
        if qr-svg != none {
          image(bytes(qr-svg), width: 38pt)
        } else if qr-img != none {
          image(qr-img, width: 38pt)
        } else {
          none
        },
        [
          #if protocol != none [
            #text(fill: text-primary, size: 8pt, weight: "bold")[Ordem de Serviço #protocol #if version != none [· Versão #version]] \
          ]
          #text(fill: text-muted, size: 7.5pt)[
            #if issued-at != "" or issued-by != "" [Emitida #if issued-at != "" [em #issued-at] #if issued-by != "" [por #issued-by] \ ]
            Código de verificação: #strong(doc-code) \
            #link(verify-url)[#text(fill: brand-primary, "Confira em " + verify-display)]
          ]
        ],
        [
          #text(fill: text-muted, size: 8pt)[
            Página #context counter(page).display("1 de 1", both: true)
          ]
        ]
      )
    ]
  } else if mode == "contact" {
    // Variação 2: Barra de contato corporativa (baseada no rodapé da Azuos)
    let phone = data.at("phone", default: "(62) 3261-9788")
    let address = data.at("address", default: "R. S-1, Q. 153, L. 25, St. Bueno, Goiânia - GO, 74230-220")
    let email = data.at("email", default: "contato@azuoscontabil.com.br")

    rect(
      width: 100%,
      fill: brand-primary,
      inset: (x: 10pt, y: 6pt),
      radius: 0pt,
      [
        #align(center + horizon)[
          #text(fill: white, size: 8pt, weight: "medium")[
            📞 #phone #h(10pt) | #h(10pt) 📍 #address #h(10pt) | #h(10pt) ✉ #email
          ]
        ]
      ]
    )
  } else if mode == "minimal" {
    // Variação 3: Numeração simples
    align(right)[
      #text(fill: text-muted, size: 8.5pt)[
        Página #context counter(page).display("1 de 1", both: true)
      ]
    ]
  } else {
    // Variação 4: Corporativo / Jurídico com código e confidencialidade
    let doc-ref = data.at("doc-ref", default: "")
    let note = data.at("note", default: "Documento gerado eletronicamente")

    block(width: 100%)[
      #line(length: 100%, stroke: 0.5pt + border-dark)
      #v(3pt)
      #grid(
        columns: (1fr, auto),
        align: (left + horizon, right + horizon),
        text(fill: text-muted, size: 8pt)[
          #note #if doc-ref != "" [ · Ref: #doc-ref]
        ],
        text(fill: text-muted, size: 8pt)[
          Página #context counter(page).display("1 de 1", both: true)
        ]
      )
    ]
  }
}

// --- Função Principal de Documento (100% Visual / Genérica) ---
#let template-doc(
  title: none,
  subtitle: none,
  paper: "a4",
  orientation: "portrait",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.0cm, right: 2.0cm),
  font-family: default-font-family,
  font-stretch: default-font-stretch,
  font-size: 11pt,
  show-brand: true,
  brand-path: "/brand.png",
  brand-mode: "logo",
  brand-width: 5.2cm,
  footer-mode: "corporate",
  footer-data: (:),
  body,
) = {
  // Configuração da Página
  set page(
    paper: paper,
    flipped: orientation == "landscape",
    margin: margin,
    header: context {
      let page-num = counter(page).get().first()
      if page-num > 1 {
        render-running-header(title: title, brand-path: brand-path)
      }
    },
    footer: render-footer(
      mode: footer-mode,
      data: footer-data,
    ),
  )

  // Configuração Tipográfica Estrita (Arial Narrow / Liberation Sans Narrow)
  set text(
    font: font-family,
    stretch: font-stretch,
    size: font-size,
    fill: text-primary,
    lang: "pt",
  )

  set par(
    justify: true,
    leading: 0.75em,
  )

  // Header na primeira página com o brand.png proeminente
  if show-brand or title != none {
    render-header(
      show-brand: show-brand,
      brand-path: brand-path,
      brand-mode: brand-mode,
      brand-width: brand-width,
      title: title,
      subtitle: subtitle,
    )
  }

  body
}
