/**
 * O vocabulário de situação de uma tarefa — a feature de EXEMPLO do template.
 *
 * Ela existe para mostrar o caminho inteiro (contrato → banco → API → tela) funcionando. Na
 * primeira feature de verdade, ela serve de molde; quando não servir mais, apague a feature
 * inteira com a skill `remover-exemplo`.
 *
 * A lista mora no domínio, e não no componente nem no banco, porque os três a usam: o schema
 * Zod valida com ela, a coluna do SQLite restringe com ela e o selo escolhe a cor por ela.
 * Três listas escritas à mão divergem na primeira vez que alguém acrescenta um valor.
 */
export const TASK_STATUSES = ['todo', 'doing', 'done'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

/** O texto de tela. A chave é inglês (o usuário não vê); o rótulo é português (vê). */
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'A fazer',
  doing: 'Em andamento',
  done: 'Concluída',
};

export type TaskStatusTone = 'neutral' | 'info' | 'success';

/**
 * O tom vem do domínio, não da tela. Deixar cada tela escolher a cor é como a mesma situação
 * aparece verde numa lista e cinza em outra.
 */
const TONES: Record<TaskStatus, TaskStatusTone> = {
  todo: 'neutral',
  doing: 'info',
  done: 'success',
};

export function taskStatusTone(status: TaskStatus): TaskStatusTone {
  return TONES[status];
}

export function isTaskStatus(value: unknown): value is TaskStatus {
  return typeof value === 'string' && (TASK_STATUSES as readonly string[]).includes(value);
}

export type TaskProgress = { percentage: number; done: number; total: number };

/**
 * Quanto do trabalho já foi concluído.
 *
 * Lista vazia NÃO é 0%: não há nada a cumprir. Devolver 0 faria um painel sem tarefas acusar
 * atraso — e por isso `total: 0` sai explícito, para a tela escolher o que dizer.
 */
export function calculateTaskProgress(statuses: readonly TaskStatus[]): TaskProgress {
  const total = statuses.length;
  if (total === 0) return { percentage: 0, done: 0, total: 0 };

  const done = statuses.filter((status) => status === 'done').length;

  return { percentage: Math.round((done / total) * 100), done, total };
}
