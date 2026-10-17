/**
 * OS TEXTOS DO BOT DE WHATSAPP.
 *
 * Cada mensagem que o bot manda é um MODELO: um texto com variáveis entre chaves duplas
 * (`{{protocolo}}`) que o sistema preenche na hora de enviar. O super admin edita o texto em
 * volta; as variáveis são uma lista fixa por mensagem, porque só o sistema sabe quais dados
 * existem naquele momento.
 *
 * A formatação é a do próprio WhatsApp: `*negrito*`, `_itálico_`, `~riscado~`.
 */
export const WHATSAPP_TEMPLATE_KEYS = [
  'ticket_opened',
  'ticket_ready',
  'intake_link',
  'access_name',
  'access_who',
  'access_email',
  'access_phone',
  'access_department',
  'access_invalid',
  'access_created',
  'limit_alert',
] as const;

/**
 * A assinatura no topo de TODA mensagem do bot: "*Ana Lima BOT*". Quem recebe sabe na hora que
 * a resposta é automática, e de qual atendimento ela vem — o número é o WhatsApp pessoal de
 * quem atende. Fica fora do modelo editável para nenhuma mensagem sair sem ela.
 */
export function signBotMessage(operatorName: string, body: string): string {
  const name = operatorName.trim() || 'Acerola';

  return `*${name} BOT*\n\n${body}`;
}

export type WhatsappTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

export type WhatsappTemplateDefinition = {
  /** Como a tela chama esta mensagem. */
  label: string;
  /** Quando ela é enviada, numa frase. */
  description: string;
  variables: readonly string[];
  defaultBody: string;
};

export const WHATSAPP_TEMPLATES: Record<WhatsappTemplateKey, WhatsappTemplateDefinition> = {
  ticket_opened: {
    label: 'Chamado aberto',
    description: 'Enviada a quem abriu o chamado pelo site, pelo número do responsável.',
    variables: ['nome', 'protocolo', 'area', 'responsavel', 'link'],
    defaultBody:
      'Olá, {{nome}}! Aqui é {{responsavel}}.\n\nRecebi o seu chamado *{{protocolo}}* ({{area}}) e já estou com ele.\n\nAcompanhe por aqui: {{link}}',
  },
  ticket_ready: {
    label: 'Chamado pronto',
    description: 'Enviada quando quem atende clica em avisar que o chamado ficou pronto.',
    variables: ['nome', 'protocolo', 'area', 'responsavel', 'solucao', 'link'],
    defaultBody:
      'Olá, {{nome}}! O seu chamado *{{protocolo}}* foi finalizado.\n\n*Solução:* {{solucao}}\n\nDetalhes: {{link}}',
  },
  intake_link: {
    label: 'Link para abrir chamado',
    description:
      'A resposta ao /chamado: o link que abre o formulário já com o responsável e o telefone de quem escreveu.',
    variables: ['responsavel', 'link', 'validade'],
    defaultBody:
      'Olá! Aqui é o atendimento de *{{responsavel}}*.\n\nPara abrir o seu chamado, toque no link e preencha o formulário:\n{{link}}\n\n> _O link vale por {{validade}} minutos._',
  },
  /* O pedido de usuário (`/acesso`) é uma pergunta por mensagem — ver `access-request.util`. */
  access_name: {
    label: 'Pedido de usuário: nome',
    description: 'A resposta ao /acesso: começa o pedido perguntando o nome completo.',
    variables: ['responsavel'],
    defaultBody:
      'Olá! Aqui é o atendimento de *{{responsavel}}*. Vou registrar o seu *pedido de usuário*.\n\nQual é o seu *nome completo*? (nome e sobrenome)\n\n> _Para desistir, responda cancelar._',
  },
  access_who: {
    label: 'Pedido de usuário: quem é você',
    description:
      'Enviada quando mais de uma pessoa do escritório tem o nome informado: pergunta qual delas está escrevendo.',
    variables: ['nome', 'opcoes'],
    defaultBody:
      'Encontrei mais de uma pessoa com esse nome. Qual delas é você? Responda com o número:\n\n{{opcoes}}',
  },
  access_email: {
    label: 'Pedido de usuário: e-mail',
    description: 'Pergunta o e-mail, depois que a pessoa informou o nome.',
    variables: ['nome'],
    defaultBody: 'Obrigado, {{nome}}! Qual é o seu *e-mail*?',
  },
  access_phone: {
    label: 'Pedido de usuário: telefone',
    description:
      'Pergunta o telefone. Só é enviada quando o WhatsApp não informa o número de quem escreve.',
    variables: ['nome'],
    defaultBody: 'Qual é o seu *telefone com DDD*?',
  },
  access_department: {
    label: 'Pedido de usuário: setor',
    description: 'Pergunta o setor de quem pede, com a lista numerada de setores.',
    variables: ['nome', 'opcoes'],
    defaultBody: 'De qual *setor* você é? Responda com o número:\n\n{{opcoes}}',
  },
  access_invalid: {
    label: 'Pedido de usuário: resposta não entendida',
    description: 'Enviada quando uma resposta do pedido de usuário não vale; repete a pergunta.',
    variables: ['erro'],
    defaultBody: '{{erro}}',
  },
  access_created: {
    label: 'Pedido de usuário registrado',
    description: 'Fecha o pedido de usuário, com o protocolo do chamado aberto.',
    variables: ['nome', 'protocolo', 'link'],
    defaultBody:
      'Pronto, {{nome}}! Seu pedido de usuário foi registrado com o protocolo *{{protocolo}}*.\n\nAcompanhe por aqui: {{link}}',
  },

  limit_alert: {
    label: 'Alerta de limite',
    description:
      'Enviada ao próprio responsável quando as mensagens do dia chegam perto do limite seguro.',
    variables: ['enviadas', 'limite'],
    defaultBody:
      '⚠️ *Acerola Ticket:* o seu número já enviou {{enviadas}} de {{limite}} mensagens automáticas hoje. Ao chegar no limite, o sistema para de enviar por você até amanhã.',
  },
};

export function isWhatsappTemplateKey(value: unknown): value is WhatsappTemplateKey {
  return (WHATSAPP_TEMPLATE_KEYS as readonly unknown[]).includes(value);
}

/** O teto do WhatsApp é bem maior; este é o de uma mensagem que alguém ainda lê. */
export const WHATSAPP_TEMPLATE_MAX_LENGTH = 2000;

const VARIABLE_PATTERN = /\{\{\s*([^{}]*?)\s*\}\}/g;

/** As variáveis que um texto usa, na ordem em que aparecem e sem repetir. */
export function templateVariablesIn(body: string): string[] {
  return [...new Set([...body.matchAll(VARIABLE_PATTERN)].map((match) => match[1] ?? ''))];
}

/**
 * As variáveis do texto que NÃO existem para aquela mensagem.
 *
 * É o que impede um `{{protocol}}` digitado errado de sair cru numa mensagem de verdade: a
 * tela recusa o salvamento e diz qual é.
 */
export function unknownTemplateVariables(key: WhatsappTemplateKey, body: string): string[] {
  const allowed = WHATSAPP_TEMPLATES[key].variables;

  return templateVariablesIn(body).filter((variable) => !allowed.includes(variable));
}

/**
 * O texto final. Variável sem valor vira um traço — nunca a chave crua, nem "undefined".
 * Variável que não existe para a mensagem fica como está: quem valida isso é o salvamento.
 */
export function renderWhatsappTemplate(
  body: string,
  values: Readonly<Record<string, string | null | undefined>>,
): string {
  return body.replace(VARIABLE_PATTERN, (whole, name: string) => {
    if (!(name in values)) return whole;

    return values[name]?.trim() || '—';
  });
}
