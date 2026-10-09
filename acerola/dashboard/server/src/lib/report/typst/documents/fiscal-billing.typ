// ==============================================================================
// DOCUMENTS/FISCAL-BILLING.TYP — DECLARAÇÃO DE FATURAMENTO FISCAL
// Reproduz com precisão o documento corporativo de exemplo da Azuos.
// Importa template.typ para o design genérico e declaration.typ para o formato específico.
// ==============================================================================

#import "../template.typ": *
#import "../declaration.typ": *

// Entrada dinâmica via sys.inputs (ou valores padrão da declaração real)
#let raw-data = sys.inputs.at("data", default: "{}")
#let input-data = if raw-data != "{}" { json(bytes(raw-data)) } else { (:) }

#let company-name = input-data.at("companyName", default: "AZUOS ASSESSORIA CONTABIL LTDA")
#let cnpj = input-data.at("cnpj", default: "18.028.812/0001-00")
#let address = input-data.at("address", default: "Rua S1, Nº 398, Quadra 153, Lote 25, Setor Bueno, Goiânia/GO, CEP: 74.230-220")
#let city-state = input-data.at("cityState", default: "Goiânia/GO")
#let date-str = input-data.at("date", default: "25 de setembro de 2026")

#let billing-rows = input-data.at("rows", default: (
  ("Setembro", "2025", "R$ 65.804,58"),
  ("Outubro", "2025", "R$ 64.642,94"),
  ("Novembro", "2025", "R$ 63.536,65"),
  ("Dezembro", "2025", "R$ 60.158,94"),
  ("Janeiro", "2026", "R$ 34.075,28"),
  ("Fevereiro", "2026", "R$ 111.582,57"),
  ("Março", "2026", "R$ 76.168,45"),
  ("Abril", "2026", "R$ 72.988,42"),
  ("Maio", "2026", "R$ 65.296,58"),
  ("Junho", "2026", "R$ 74.538,42"),
  ("Julho", "2026", "R$ 64.330,63"),
  ("Agosto", "2026", "R$ 73.399,32"),
))
#let total-val = input-data.at("total", default: "R$ 826.522,78")

#show: template-doc.with(
  paper: "a4",
  orientation: "portrait",
  margin: (top: 3.2cm, bottom: 2.8cm, left: 2.5cm, right: 2.5cm),
  font-family: ("Arial Narrow", "Arial", "Liberation Sans"),
  font-size: 11pt,
  show-brand: true,
  brand-path: "/brand.png",
  brand-mode: "logo",
  footer-mode: "contact",
  footer-data: (
    phone: "(62) 3261-9788",
    address: "R. S-1, Q. 153, L. 25, St. Bueno, Goiânia - GO, 74230-220",
    email: "contato@azuoscontabil.com.br",
  ),
)

#declaration-title("Declaração de Faturamento Fiscal")

#declaration-preamble(
  company-name,
  cnpj,
  address,
  "Declaramos para os devidos fins de direito e a quem possa interessar",
)

#declaration-table(
  ("Mês", "Ano", "Faturamento Fiscal"),
  billing-rows,
  total-row: ("Total:", "", total-val),
)

#declaration-closing(
  city-state: city-state,
  date-str: date-str,
)

#declaration-signatures((
  ("THYAGO ANTÔNIO DE SOUZA", "CPF 990.071.421-00", "CRC 022049/O-5"),
  (company-name, "Pela Empresa", "CNPJ " + cnpj),
))
