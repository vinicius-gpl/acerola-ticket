/**
 * Domínio dos Sistemas e Projetos de Software.
 *
 * Regras puras para situações, cores e extração de identificadores de repositório GitHub.
 */

export const SOFTWARE_PROJECT_STATUSES = ['active', 'maintenance', 'deprecated'] as const;
export type SoftwareProjectStatus = (typeof SOFTWARE_PROJECT_STATUSES)[number];

export const SOFTWARE_PROJECT_STATUS_LABELS: Record<SoftwareProjectStatus, string> = {
  active: 'Ativo',
  maintenance: 'Manutenção',
  deprecated: 'Legado / Descontinuado',
};

export function softwareProjectStatusLabel(status: SoftwareProjectStatus): string {
  return SOFTWARE_PROJECT_STATUS_LABELS[status] ?? status;
}

export const SOFTWARE_PROJECT_COLORS = [
  'blue',
  'green',
  'amber',
  'purple',
  'rose',
  'indigo',
] as const;
export type SoftwareProjectColor = (typeof SOFTWARE_PROJECT_COLORS)[number];

export const SOFTWARE_PROJECT_COLOR_LABELS: Record<SoftwareProjectColor, string> = {
  blue: 'Azul',
  green: 'Verde',
  amber: 'Âmbar',
  purple: 'Roxo',
  rose: 'Rosa',
  indigo: 'Índigo',
};

export const TIMELINE_EVENT_TYPES = ['pr', 'issue', 'release', 'deploy', 'maintenance'] as const;
export type TimelineEventType = (typeof TIMELINE_EVENT_TYPES)[number];

export const TIMELINE_EVENT_TYPE_LABELS: Record<TimelineEventType, string> = {
  pr: 'Pull Request',
  issue: 'Issue',
  release: 'Versão / Release',
  deploy: 'Publicação / Deploy',
  maintenance: 'Manutenção Programada',
};

export const TIMELINE_EVENT_STATUSES = ['open', 'merged', 'closed'] as const;
export type TimelineEventStatus = (typeof TIMELINE_EVENT_STATUSES)[number];

export const SCHEDULE_EVENT_CATEGORIES = [
  'standup',
  'deploy',
  'review',
  'maintenance',
  'critical',
  'other',
] as const;
export type ScheduleEventCategory = (typeof SCHEDULE_EVENT_CATEGORIES)[number];

export const SCHEDULE_EVENT_CATEGORY_LABELS: Record<ScheduleEventCategory, string> = {
  standup: 'Reunião Diária / Standup',
  deploy: 'Janela de Deploy',
  review: 'Revisão / Critica de Design',
  maintenance: 'Manutenção Programada',
  critical: 'Incidente Crítico',
  other: 'Geral',
};

/** Extrai owner e repo a partir de URLs do GitHub ou formato owner/repo. */
export function parseGitHubRepo(input: string): { owner: string; repo: string } | null {
  const clean = input.trim().replace(/\/+$/, '').replace(/\.git$/, '');
  if (!clean) return null;

  // Formato completo: https://github.com/owner/repo ou http://...
  const urlMatch = clean.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)$/i);
  if (urlMatch && urlMatch[1] && urlMatch[2]) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  // Formato curto: owner/repo
  const shortMatch = clean.match(/^([^/]+)\/([^/]+)$/);
  if (shortMatch && shortMatch[1] && shortMatch[2]) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}
