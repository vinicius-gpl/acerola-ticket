// ==============================================================================
// DOCUMENTS/SOCIAL-CONTRACT.TYP — CONTRATO SOCIAL EM TYPST
// Reproduz com precisão o documento societário de exemplo.
// Importa template.typ para o design genérico e contract.typ para o formato específico.
// ==============================================================================

#import "../template.typ": *
#import "../contract.typ": *

// Entrada dinâmica via sys.inputs (ou valores padrão do contrato real)
#let raw-data = sys.inputs.at("data", default: "{}")
#let input-data = if raw-data != "{}" { json(bytes(raw-data)) } else { (:) }

#let company-name = input-data.at("companyName", default: "WCG COMÉRCIO DE PEÇAS AUTOMOTIVAS LTDA")
#let partners = input-data.at("partners", default: (
  (
    name: "WAGNER CARVALHO GONÇALVES",
    qualification: "brasileiro, empresário, casado sob o regime de comunhão parcial de bens, nascido em 24/12/1987, natural de Goiânia/GO, portador do RG nº 4.890.123 SSP/GO e inscrito no CPF sob o nº 012.345.678-90, residente e domiciliado em Goiânia/GO",
  ),
))
#let capital-rows = input-data.at("capitalRows", default: (
  ("Wagner Carvalho Gonçalves", "20.000", "R$ 1,00", "100%", "R$ 20.000,00"),
))
#let total-row = input-data.at("totalRow", default: ("TOTAL:", "20.000", "R$ 1,00", "100%", "R$ 20.000,00"))
#let city-state = input-data.at("cityState", default: "Goiânia/GO")
#let date-str = input-data.at("date", default: "27 de maio de 2026")

#show: template-doc.with(
  paper: "a4",
  orientation: "portrait",
  margin: (top: 2.8cm, bottom: 2.4cm, left: 2.2cm, right: 2.2cm),
  font-family: ("Arial Narrow", "Arial", "Liberation Sans"),
  font-size: 10.5pt,
  show-brand: true,
  brand-path: "/brand.png",
  brand-mode: "logo",
  footer-mode: "minimal",
)

#contract-title(company-name, subtitle: "Contrato Social de Constituição")

#contract-preamble(
  partners,
  "Por este instrumento particular e na melhor forma de direito, constitui uma sociedade empresária limitada, que se regerá pelas seguintes cláusulas e condições:",
)

#contract-clause(
  "DO NOME EMPRESARIAL E DA SEDE",
  "Cláusula Primeira",
  "A sociedade girará sob o nome empresarial " + company-name + ", e adotará como nome fantasia WCG AUTO PEÇAS, com sede e domicílio na cidade de Goiânia, Estado de Goiás.",
  paragraphs: (
    "Parágrafo Único. A sociedade poderá abrir filiais, agências ou escritórios em qualquer ponto do território nacional, mediante alteração contratual devidamente registrada.",
  ),
)

#contract-clause(
  "DO OBJETO SOCIAL",
  "Cláusula Segunda",
  "A sociedade tem por objeto social o exercício das seguintes atividades econômicas principais e secundárias:",
  paragraphs: (
    "a) 4530-7/03 - Comércio a varejo de peças e acessórios novos para veículos automotores;",
    "b) 4530-7/01 - Comércio por atacado de peças e acessórios novos para veículos automotores.",
  ),
)

#contract-clause(
  "DO CAPITAL SOCIAL E DAS QUOTAS",
  "Cláusula Terceira",
  "O capital social, totalmente subscrito e integralizado em moeda corrente do País, é de R$ 20.000,00 (vinte mil reais), dividido em 20.000 (vinte mil) quotas no valor nominal de R$ 1,00 (um real) cada uma, assim distribuídas entre os sócios:",
)

#contract-capital-table(
  ("SÓCIO", "QT QUOTAS", "VL QUOTA", "%", "VLR TOTAL"),
  capital-rows,
  total-row: total-row,
)

#contract-clause(
  "DA ADMINISTRAÇÃO DA SOCIEDADE",
  "Cláusula Quarta",
  "A administração da sociedade caberá ao sócio WAGNER CARVALHO GONÇALVES, com plenos poderes para representá-la ativa e passivamente, judicial e extrajudicialmente, praticando todos os atos necessários à consecução dos fins sociais.",
)

#contract-clause(
  "DO FORO JURÍDICO",
  "Cláusula Quinta",
  "Fica eleito o foro da Comarca de Goiânia/GO para dirimir quaisquer dúvidas ou litígios decorrentes do presente contrato social, com renúncia expressa a qualquer outro, por mais privilegiado que seja.",
)

#contract-closing(
  city-state: city-state,
  date-str: date-str,
  signers: (
    ("WAGNER CARVALHO GONÇALVES", "Sócio Administrador", "CPF: 012.345.678-90"),
  ),
)
