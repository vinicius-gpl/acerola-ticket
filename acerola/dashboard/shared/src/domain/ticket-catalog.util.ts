import {
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  type Department,
  departmentLabel,
  departmentOptions,
  isDepartment,
} from './department.util';

/**
 * As duas listas fechadas que quem abre um chamado escolhe: o departamento e o tipo de
 * problema.
 *
 * São listas, e não texto livre, porque os dois campos alimentam os indicadores do painel
 * ("quais departamentos mais pedem", "qual problema mais aparece"). Com texto livre, "RH",
 * "rh" e "Recursos Humanos" viram três departamentos diferentes e o gráfico mente.
 *
 * Tipo de problema novo entra aqui. Departamento novo entra em `department.util.ts`, que é
 * de onde os daqui vêm.
 */

/**
 * O departamento de um chamado é o MESMO cadastro de departamentos do sistema — a lista mora
 * em `department.util.ts`, porque computador também pertence a um departamento. Os nomes
 * abaixo existem só para o resto da feature continuar lendo "ticketDepartment…", sem uma
 * segunda lista que possa divergir da primeira.
 */
export const TICKET_DEPARTMENTS = DEPARTMENTS;

export type TicketDepartment = Department;

export const TICKET_DEPARTMENT_LABELS = DEPARTMENT_LABELS;

export const ticketDepartmentLabel = departmentLabel;

export const isTicketDepartment = isDepartment;

export const ticketDepartmentOptions = departmentOptions;

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

export function ticketProblemTypeOptions(): { value: TicketProblemType; label: string }[] {
  return TICKET_PROBLEM_TYPES.map((value) => ({ value, label: TICKET_PROBLEM_TYPE_LABELS[value] }));
}
