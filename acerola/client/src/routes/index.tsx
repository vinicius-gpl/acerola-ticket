import { createFileRoute, redirect } from '@tanstack/react-router';

/**
 * A raiz não tem tela própria: ela manda para a tela principal do MVP.
 *
 * Quando a tela principal mudar, é aqui que muda — e só aqui.
 */
export const Route = createFileRoute('/')({
  beforeLoad: () => {
    throw redirect({ to: '/tasks' });
  },
});
