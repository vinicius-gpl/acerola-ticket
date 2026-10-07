import {
  DEPARTMENT_LABELS,
  DEPARTMENTS,
  type Department,
  departmentLabel,
  departmentOptions,
  isDepartment,
} from './department.util';
import { ROLE_CONTEXT_LABELS, ROLE_CONTEXTS, type RoleContext } from './role-context.util';

/**
 * As listas fechadas que quem abre um chamado escolhe: a área, o departamento e o tipo de
 * problema.
 *
 * São listas, e não texto livre, porque os campos alimentam os indicadores do painel
 * ("quais departamentos mais pedem", "qual problema mais aparece"). Com texto livre, "RH",
 * "rh" e "Recursos Humanos" viram três departamentos diferentes e o gráfico mente.
 *
 * Tipo de problema novo entra aqui. Departamento novo entra em `department.util.ts`, que é
 * de onde os daqui vêm.
 */

/**
 * A ÁREA de um chamado é o MESMO contexto do cargo interno (#11) — é ele que decide quem
 * atende (ver `access.policy.ts`, `canManageInContext`). Os nomes abaixo existem só para a
 * feature de chamados continuar lendo "ticketArea…", sem uma segunda lista que possa divergir
 * da primeira.
 */
export const TICKET_AREAS = ROLE_CONTEXTS;

export type TicketArea = RoleContext;

export const TICKET_AREA_LABELS = ROLE_CONTEXT_LABELS;

export function ticketAreaLabel(area: TicketArea): string {
  return TICKET_AREA_LABELS[area];
}

export function isTicketArea(value: unknown): value is TicketArea {
  return typeof value === 'string' && (TICKET_AREAS as readonly string[]).includes(value);
}

export function ticketAreaOptions(): { value: TicketArea; label: string }[] {
  return TICKET_AREAS.map((value) => ({ value, label: TICKET_AREA_LABELS[value] }));
}

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
 * Tipo de problema — uma lista POR ÁREA, porque "rede caiu" não existe em Manutenção e
 * "ar-condicionado quebrado" não existe em Infra. Nomes em inglês (categoria comum de
 * suporte); o rótulo em português é o que aparece na tela.
 *
 * A área de Infra é a lista que já existia antes da #13 — mantida com o mesmo conteúdo para
 * não mudar o significado dos chamados já abertos.
 */
const INFRA_PROBLEM_TYPES = [
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

/** Sistema é baixa complexidade de propósito (ver issue #13): bug, pedido, acesso. */
const SISTEMA_PROBLEM_TYPES = [
  'bug',
  'feature_request',
  'access_request',
  'data_correction',
  'other',
] as const;

/** Manutenção é predial/físico: poucas opções, sem a complexidade de Infra. */
const MANUTENCAO_PROBLEM_TYPES = [
  'air_conditioning',
  'furniture',
  'lighting',
  'cleaning',
  'structural',
  'other',
] as const;

export const TICKET_PROBLEM_TYPES_BY_AREA = {
  infra: INFRA_PROBLEM_TYPES,
  sistema: SISTEMA_PROBLEM_TYPES,
  manutencao: MANUTENCAO_PROBLEM_TYPES,
} as const satisfies Record<TicketArea, readonly string[]>;

export type InfraProblemType = (typeof INFRA_PROBLEM_TYPES)[number];
export type SistemaProblemType = (typeof SISTEMA_PROBLEM_TYPES)[number];
export type ManutencaoProblemType = (typeof MANUTENCAO_PROBLEM_TYPES)[number];

/**
 * A UNIÃO de todas as áreas — é o que o BANCO aceita (uma coluna só, `problem_type`, guarda o
 * tipo de qualquer área). Quem garante que o tipo COMBINA com a área escolhida é o contrato
 * (`ticket.schema.ts`, validação cruzada), não esta lista.
 */
export const TICKET_PROBLEM_TYPES = Array.from(
  new Set(Object.values(TICKET_PROBLEM_TYPES_BY_AREA).flat()),
) as TicketProblemType[];

export type TicketProblemType = InfraProblemType | SistemaProblemType | ManutencaoProblemType;

export const TICKET_PROBLEM_TYPE_LABELS: Record<TicketProblemType, string> = {
  network: 'Internet / Rede',
  slow_computer: 'Computador lento',
  printer: 'Impressora',
  email: 'E-mail',
  internal_system: 'Sistema interno',
  digital_certificate: 'Certificado digital',
  software_install: 'Instalação de programa',
  remote_access: 'AnyDesk / Acesso remoto',
  bug: 'Erro no sistema',
  feature_request: 'Pedido de melhoria',
  access_request: 'Pedido de acesso',
  data_correction: 'Correção de dado',
  air_conditioning: 'Ar-condicionado',
  furniture: 'Mobiliário',
  lighting: 'Iluminação',
  cleaning: 'Limpeza',
  structural: 'Estrutura / Predial',
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

/** Os tipos de problema da área — é o que o formulário mostra depois de escolher a área. */
export function ticketProblemTypesForArea(area: TicketArea): readonly TicketProblemType[] {
  return TICKET_PROBLEM_TYPES_BY_AREA[area];
}

export function ticketProblemTypeOptionsForArea(
  area: TicketArea,
): { value: TicketProblemType; label: string }[] {
  return TICKET_PROBLEM_TYPES_BY_AREA[area].map((value) => ({
    value,
    label: TICKET_PROBLEM_TYPE_LABELS[value],
  }));
}

export function isTicketProblemTypeForArea(area: TicketArea, value: unknown): boolean {
  return (
    typeof value === 'string' &&
    (TICKET_PROBLEM_TYPES_BY_AREA[area] as readonly string[]).includes(value)
  );
}
