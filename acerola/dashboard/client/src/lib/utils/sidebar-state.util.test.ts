import { describe, expect, it } from 'vitest';

import { sidebarOpenFromCookie } from './sidebar-state.util';

describe('sidebarOpenFromCookie', () => {
  // feliz
  /* Quem fechou a barra a encontra fechada na próxima visita, mesmo entre outros cookies. */
  it('keeps the sidebar closed when the cookie says so', () => {
    expect(sidebarOpenFromCookie('theme=dark; sidebar_state=false; other=1')).toBe(false);
  });

  // feliz
  it('opens the sidebar when the cookie says so', () => {
    expect(sidebarOpenFromCookie('sidebar_state=true')).toBe(true);
  });

  // triste
  /* Primeira visita, sem cookie nenhum: a barra começa aberta, que é o padrão do shadcn. */
  it('opens the sidebar when there is no cookie', () => {
    expect(sidebarOpenFromCookie('')).toBe(true);
  });

  // triste
  /* Um cookie de nome parecido não pode fechar a barra de ninguém. */
  it('ignores a cookie whose name only starts the same', () => {
    expect(sidebarOpenFromCookie('sidebar_state_old=false')).toBe(true);
  });
});
