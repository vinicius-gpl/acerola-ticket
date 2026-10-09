import { type SoftwareProjectInsert } from '../../../server/src/lib/db/schema/software-projects.schema';

/** Repositórios visíveis em `gh repo list grupo-azuos` em 2026-10-08. */
const ORGANIZATION_REPOSITORIES = [
  {
    name: 'admin-console',
    description: 'Gerenciador de usuário, seria uma tela de login e registro para usuários, com auth-forward.',
  },
  { name: 'paralegal', description: 'Versão 2.0 do paralegal.' },
  { name: 'api-publica', description: 'Api de dados publicos.' },
  {
    name: 'transferencia-fiscal',
    description: 'Sistema de recebimento de arquivos para contabilidade.',
  },
  { name: 'gestao-rh', description: 'Sistema de gestão do RH.' },
  { name: 'gestao-contabil', description: 'Sistema de gestão contábil.' },
  { name: 'controle-taxa-fiscal', description: 'Sistema de controle tributário.' },
  { name: 'certmonitor', description: 'Migração do certmonitor para um código limpo.' },
  { name: '.github-private', description: 'Repositório privado de configurações da organização.' },
  { name: 'template', description: 'Template padrão de Nest, React, SAP e ferramentas de desenvolvimento.' },
  {
    name: 'checklist-analise',
    description: 'Acompanhamento de tarefas por empresa e período.',
  },
  { name: 'controle-folha-pagamento', description: 'Sistema de controle de folha de pagamento.' },
  { name: 'infra-docs', description: 'Documentação da infraestrutura.' },
];

const COLORS = ['blue', 'green', 'amber', 'purple', 'rose', 'indigo'] as const;

export const SOFTWARE_PROJECTS_SEED: SoftwareProjectInsert[] = ORGANIZATION_REPOSITORIES.map(
  (repository, index) => ({
    id: index + 1,
    name: repository.name,
    description: repository.description,
    repositoryUrl: `grupo-azuos/${repository.name}`,
    githubRepoOwner: 'grupo-azuos',
    githubRepoName: repository.name,
    status: 'active',
    color: COLORS[index % COLORS.length]!,
    createdBy: 'demo@azuos.local',
  }),
);

/** A timeline é preenchida somente pela sincronização com o GitHub. */
export const SOFTWARE_TIMELINE_SEED: never[] = [];

export function getScheduleSeed() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  function dateAt(days: number): string {
    const date = new Date(monday);
    date.setDate(monday.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  const events = [
    {
      title: 'DEMO · Planejamento da sprint',
      note: 'Revisar prioridades e distribuir tarefas da semana.',
      projectId: 1,
      startTime: '09:00',
      endTime: '10:00',
      color: 'blue' as const,
      category: 'standup' as const,
    },
    {
      title: 'DEMO · Revisão do portal Paralegal',
      note: 'Validar a entrega com a equipe.',
      projectId: 2,
      startTime: '10:30',
      endTime: '11:30',
      color: 'green' as const,
      category: 'review' as const,
    },
    {
      title: 'DEMO · Deploy da API pública',
      note: 'Janela de publicação de demonstração.',
      projectId: 3,
      startTime: '14:00',
      endTime: '15:00',
      color: 'purple' as const,
      category: 'deploy' as const,
    },
    {
      title: 'DEMO · Refinamento de demandas do RH',
      note: 'Organizar melhorias e critérios de aceite.',
      projectId: 5,
      startTime: '09:30',
      endTime: '10:30',
      color: 'amber' as const,
      category: 'review' as const,
    },
    {
      title: 'DEMO · Revisão técnica de infraestrutura',
      note: 'Exemplo de compromisso sem vínculo com repositório.',
      projectId: null,
      startTime: '15:00',
      endTime: '16:00',
      color: 'neutral' as const,
      category: 'maintenance' as const,
    },
  ];

  return events.map((event, index) => ({
    ...event,
    id: index + 1,
    date: dateAt(index),
    createdBy: 'demo@azuos.local',
    createdAt: now,
    updatedAt: now,
  }));
}
