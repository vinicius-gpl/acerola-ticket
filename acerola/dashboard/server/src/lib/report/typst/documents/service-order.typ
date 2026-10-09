// ==============================================================================
// DOCUMENTS/SERVICE-ORDER.TYP — ORDEM DE SERVIÇO EM TYPST
// Importa template.typ para o design genérico e service-order.typ para específico.
// ==============================================================================

#import "../template.typ": *
#import "../service-order.typ": *

// Carregamento de dados de entrada via sys.inputs (ou valores padrão para pré-visualização)
#let raw-data = sys.inputs.at("data", default: "{}")
#let data-file = sys.inputs.at("data_file", default: none)
#let input-data = if data-file != none {
  json(data-file)
} else if raw-data != "{}" {
  json(bytes(raw-data))
} else {
  (:)
}

#let protocol = input-data.at("protocol", default: "CH-0001")
#let status = input-data.at("status", default: "Em Atendimento")
#let status-tone = input-data.at("statusTone", default: "info")
#let priority = input-data.at("priority", default: "Alta")
#let priority-tone = input-data.at("priorityTone", default: "danger")
#let area = input-data.at("area", default: "Infraestrutura")
#let department = input-data.at("department", default: "Financeiro")
#let requester-name = input-data.at("requesterName", default: "Ana Paula Silva")
#let contact-phone = input-data.at("contactPhone", default: "(62) 99876-5432")
#let anydesk-id = input-data.at("anydeskId", default: "987 654 321")
#let computer-name = input-data.at("computerName", default: "FIN-DESK-04")
#let computer-model = input-data.at("computerModel", default: "Dell OptiPlex 3090")
#let created-at = input-data.at("createdAt", default: "25/09/2026 09:15")
#let problem-label = input-data.at("problemLabel", default: "Impressora não imprime")
#let description = input-data.at("description", default: "A impressora do setor fiscal parou de responder na rede após a troca de toner. Documentos ficam presos na fila de impressão.")
#let solution = input-data.at("solution", default: "Reconfigurado o spooler de impressão no host e atualizado o driver de rede. Teste de impressão de página de teste concluído com sucesso.")
#let resolved-at = input-data.at("resolvedAt", default: "25/09/2026 11:30")
#let technician = input-data.at("technician", default: "Carlos Eduardo Santos")
#let histories = input-data.at("histories", default: (
  (
    type: "Início do Atendimento",
    tone: "info",
    author: "Carlos Eduardo Santos",
    date: "25/09/2026 09:30",
    minutes: 15,
    description: "Diagnóstico inicial da fila de impressão e conexão via AnyDesk.",
  ),
  (
    type: "Resolução",
    tone: "success",
    author: "Carlos Eduardo Santos",
    date: "25/09/2026 11:30",
    minutes: 45,
    description: "Limpeza da fila de spooler, reinício do serviço e reinstalação dos drivers.",
  ),
))

#let verify-url = input-data.at("verifyUrl", default: "https://acerola.azuos.com.br/verify")
#let verify-display = input-data.at("verifyDisplayUrl", default: verify-url)
#let qr-image = input-data.at("qrImage", default: none)
#let qr-svg = input-data.at("qrSvg", default: none)
#let doc-code = input-data.at("code", default: "CH-0001 · V1")
#let version = input-data.at("version", default: "1")
#let issued-by = input-data.at("issuedByName", default: "Carlos Eduardo Santos")
#let issued-at = input-data.at("issuedAt", default: "25/09/2026 11:45")
#let custom-fields = input-data.at("fields", default: none)
#let show-closure = input-data.at("showClosure", default: false)

#show: template-doc.with(
  title: "ORDEM DE SERVIÇO Nº " + protocol,
  subtitle: "Comprovante Técnico de Atendimento",
  paper: "a4",
  orientation: "portrait",
  margin: (top: 2.2cm, bottom: 2.2cm, left: 1.8cm, right: 1.8cm),
  font-family: ("Liberation Sans", "Arial"),
  font-stretch: 75%,
  font-size: 10pt,
  show-brand: true,
  brand-path: "/brand.png",
  brand-mode: "compact",
  footer-mode: "qrcode",
  footer-data: (
    qr-image: qr-image,
    qr-svg: qr-svg,
    verify-url: verify-url,
    verify-display: verify-display,
    code: doc-code,
    protocol: protocol,
    version: version,
    issued-by: issued-by,
    issued-at: issued-at,
  ),
)

// Corpo da Ordem de Serviço
#so-header(
  protocol: protocol,
  status: status,
  status-tone: status-tone,
  priority: priority,
  priority-tone: priority-tone,
  area: area,
  department: department,
)

#so-details-grid(
  fields: custom-fields,
  requester-name: requester-name,
  contact-phone: contact-phone,
  anydesk-id: anydesk-id,
  computer-name: computer-name,
  computer-model: computer-model,
  created-at: created-at,
)

#so-description-block(description, problem-label: problem-label)

#so-solution-block(solution, resolved-at: resolved-at, technician: technician)

#so-timeline(histories)

#if show-closure [
  #so-closure-block(technician-name: technician, requester-name: requester-name)
]
