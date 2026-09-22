/**
 * As duas listas fechadas que quem abre um chamado escolhe: o departamento e o tipo de
 * problema.
 *
 * São listas, e não texto livre, porque os dois campos alimentam os indicadores do painel
 * ("quais departamentos mais pedem", "qual problema mais aparece"). Com texto livre, "RH",
 * "rh" e "Recursos Humanos" viram três departamentos diferentes e o gráfico mente.
 *
 * Departamento novo? Acrescente aqui e rode `npm run db:generate`: a checagem do banco é
 * gerada desta mesma lista, então o formulário e o Postgres nunca discordam.
 */

/**
 * Os departamentos são nomes próprios da empresa — não se traduzem. A chave é a versão sem
 * acento e em minúscula do próprio nome, para caber em coluna e URL sem escapar nada.
 */
export const TICKET_DEPARTMENTS = [
  'analyze',
  'certificado',
  'comercial',
  'contabil',
  'cs',
  'financeiro',
  'fiscal',
  'paralegal',
  'pessoal',
  'recepcao',
  'rh',
] as const;

export type TicketDepartment = (typeof TICKET_DEPARTMENTS)[number];

export const TICKET_DEPARTMENT_LABELS: Record<TicketDepartment, string> = {
  analyze: 'ANALYZE',
  certificado: 'CERTIFICADO',
  comercial: 'COMERCIAL',
  contabil: 'CONTÁBIL',
  cs: 'CS',
  financeiro: 'FINANCEIRO',
  fiscal: 'FISCAL',
  paralegal: 'PARALEGAL',
  pessoal: 'PESSOAL',
  recepcao: 'RECEPÇÃO',
  rh: 'RH',
};

export function ticketDepartmentLabel(department: TicketDepartment): string {
  return TICKET_DEPARTMENT_LABELS[department];
}

export function isTicketDepartment(value: unknown): value is TicketDepartment {
  return typeof value === 'string' && (TICKET_DEPARTMENTS as readonly string[]).includes(value);
}

/**
 * Tipo de problema. Ao contrário do departamento, estes são categorias comuns de suporte e
 * têm nome em inglês — o rótulo em português é o que aparece na tela.
 */
export const TICKET_PROBLEM_TYPES = [
  'network',
  'slow_computer',
  'printer',
  'email',
  'internal_system',
  'digital_certificate',
  'software_install',
  'remote_access',
  'other',
] as const;

export type TicketProblemType = (typeof TICKET_PROBLEM_TYPES)[number];

export const TICKET_PROBLEM_TYPE_LABELS: Record<TicketProblemType, string> = {
  network: 'Internet / Rede',
  slow_computer: 'Computador lento',
  printer: 'Impressora',
  email: 'E-mail',
  internal_system: 'Sistema interno',
  digital_certificate: 'Certificado digital',
  software_install: 'Instalação de programa',
  remote_access: 'AnyDesk / Acesso remoto',
  other: 'Outro',
};

export function ticketProblemTypeLabel(type: TicketProblemType): string {
  return TICKET_PROBLEM_TYPE_LABELS[type];
}

export function isTicketProblemType(value: unknown): value is TicketProblemType {
  return typeof value === 'string' && (TICKET_PROBLEM_TYPES as readonly string[]).includes(value);
}

/** As opções na ordem em que aparecem no `select`, já com o rótulo pronto. */
export function ticketDepartmentOptions(): { value: TicketDepartment; label: string }[] {
  return TICKET_DEPARTMENTS.map((value) => ({ value, label: TICKET_DEPARTMENT_LABELS[value] }));
}

export function ticketProblemTypeOptions(): { value: TicketProblemType; label: string }[] {
  return TICKET_PROBLEM_TYPES.map((value) => ({ value, label: TICKET_PROBLEM_TYPE_LABELS[value] }));
}
